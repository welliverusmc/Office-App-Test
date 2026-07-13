const STORAGE_KEY = "centralizedOfficeTimeClockV2";

const elements = {
  statusBadge: document.getElementById("statusBadge"),
  todayLabel: document.getElementById("todayLabel"),
  currentTime: document.getElementById("currentTime"),
  sessionTimer: document.getElementById("sessionTimer"),
  sessionMessage: document.getElementById("sessionMessage"),
  mainActionButton: document.getElementById("mainActionButton"),
  resetButton: document.getElementById("resetButton"),
  actionHint: document.getElementById("actionHint"),
  ticketDate: document.getElementById("ticketDate"),
  ticketStatus: document.getElementById("ticketStatus"),
  ticketClockIn: document.getElementById("ticketClockIn"),
  ticketClockOut: document.getElementById("ticketClockOut"),
  ticketTotal: document.getElementById("ticketTotal"),
  weeklyTotal: document.getElementById("weeklyTotal"),
  weeklyDays: document.getElementById("weeklyDays"),
  photoInput: document.getElementById("photoInput"),
  toast: document.getElementById("toast")
};

let state = loadState();
let timerHandle = null;
let pendingAction = null;
let pendingLocation = null;
let toastHandle = null;

function defaultState() {
  return {
    activeShift: null,
    latestTicket: null,
    tickets: []
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultState();

    saved.tickets = Array.isArray(saved.tickets) ? saved.tickets : [];
    if (saved.latestTicket && saved.tickets.length === 0) {
      saved.tickets.push(saved.latestTicket);
    }
    return saved;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function updateCurrentClock() {
  const now = new Date();
  elements.todayLabel.textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  elements.currentTime.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

function showToast(message, duration = 2600) {
  window.clearTimeout(toastHandle);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  if (duration > 0) {
    toastHandle = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, duration);
  }
}

function hideToast() {
  window.clearTimeout(toastHandle);
  elements.toast.classList.remove("show");
}

function setBusy(isBusy, message = "") {
  elements.mainActionButton.disabled = isBusy;
  if (message) {
    elements.actionHint.textContent = message;
  }
}

function getPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function requestLocation() {
  if (!window.isSecureContext) {
    throw new Error("GPS requires the site to use HTTPS.");
  }

  if (!navigator.geolocation) {
    throw new Error("This browser does not support GPS.");
  }

  let position;

  try {
    position = await getPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  } catch (error) {
    if (error.code === error.PERMISSION_DENIED) {
      throw new Error("Location permission was denied. Allow location access and try again.");
    }

    try {
      showToast("Still locating you. Trying again...", 0);
      position = await getPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000
      });
    } catch (retryError) {
      if (retryError.code === retryError.PERMISSION_DENIED) {
        throw new Error("Location permission was denied. Allow location access and try again.");
      }
      if (retryError.code === retryError.TIMEOUT) {
        throw new Error("GPS could not get a location. Check that Location is turned on.");
      }
      throw new Error("Your location could not be captured.");
    }
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    capturedAt: Date.now()
  };
}

function requestPhoto() {
  return new Promise((resolve, reject) => {
    pendingAction = { resolve, reject };
    elements.photoInput.value = "";
    elements.photoInput.click();
  });
}

elements.photoInput.addEventListener("change", () => {
  const file = elements.photoInput.files?.[0];

  if (!pendingAction) {
    return;
  }

  if (!file) {
    pendingAction.reject(new Error("No photo was taken."));
  } else {
    pendingAction.resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      capturedAt: Date.now()
    });
  }

  pendingAction = null;
});

async function beginVerification(actionType) {
  setBusy(true);
  showToast("Requesting GPS location...", 0);

  try {
    pendingLocation = await requestLocation();

    setBusy(true);
    showToast("GPS verified. Opening camera...", 0);

    const photo = await requestPhoto();
    showToast("Photo captured. Completing request...", 0);

    if (actionType === "clockIn") {
      completeClockIn(pendingLocation, photo);
    } else {
      completeClockOut(pendingLocation, photo);
    }
  } catch (error) {
    showToast(error.message);
    setBusy(false);
    elements.actionHint.textContent = state.activeShift
      ? "Tap once to verify GPS and take your clock-out photo."
      : "Tap once to verify GPS and take your photo.";
  } finally {
    pendingLocation = null;
  }
}

function completeClockIn(location, photo) {
  const now = Date.now();

  state.activeShift = {
    clockInTime: now,
    clockInLocation: location,
    clockInPhoto: photo
  };

  saveState();
  startTimer();
  render();
  showToast("You are now clocked in.");
}

function completeClockOut(location, photo) {
  if (!state.activeShift) {
    render();
    return;
  }

  const now = Date.now();
  const ticket = {
    ...state.activeShift,
    clockOutTime: now,
    clockOutLocation: location,
    clockOutPhoto: photo,
    totalMilliseconds: now - state.activeShift.clockInTime
  };

  state.latestTicket = ticket;
  state.tickets = Array.isArray(state.tickets) ? state.tickets : [];
  state.tickets.push(ticket);
  state.activeShift = null;

  saveState();
  stopTimer();
  render();
  showToast("You have successfully clocked out.");
}

function startTimer() {
  stopTimer();

  const tick = () => {
    if (!state.activeShift) {
      elements.sessionTimer.textContent = "00:00:00";
      return;
    }

    elements.sessionTimer.textContent =
      formatDuration(Date.now() - state.activeShift.clockInTime);
  };

  tick();
  timerHandle = window.setInterval(() => {
    tick();
    renderWeeklyHours();
  }, 1000);
}

function stopTimer() {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function renderTicket() {
  const ticket = state.latestTicket;

  if (!ticket) {
    elements.ticketDate.textContent = "No completed shift yet";
    elements.ticketStatus.textContent = "PENDING";
    elements.ticketStatus.classList.remove("complete");
    elements.ticketClockIn.textContent = "--";
    elements.ticketClockOut.textContent = "--";
    elements.ticketTotal.textContent = "00:00:00";
    return;
  }

  elements.ticketDate.textContent = formatDate(ticket.clockInTime);
  elements.ticketStatus.textContent = "COMPLETE";
  elements.ticketStatus.classList.add("complete");
  elements.ticketClockIn.textContent = formatTime(ticket.clockInTime);
  elements.ticketClockOut.textContent = formatTime(ticket.clockOutTime);
  elements.ticketTotal.textContent =
    formatDuration(ticket.totalMilliseconds);
}


function startOfWeek(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatHoursMinutes(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function renderWeeklyHours() {
  const weekStart = startOfWeek();
  const weekEnd = weekStart + (7 * 24 * 60 * 60 * 1000);
  const dailyTotals = new Map();

  const tickets = Array.isArray(state.tickets) ? state.tickets : [];

  tickets.forEach((ticket) => {
    if (!ticket.clockInTime || ticket.clockInTime < weekStart || ticket.clockInTime >= weekEnd) {
      return;
    }

    const dayKey = new Date(ticket.clockInTime).toDateString();
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + ticket.totalMilliseconds);
  });

  if (state.activeShift &&
      state.activeShift.clockInTime >= weekStart &&
      state.activeShift.clockInTime < weekEnd) {
    const dayKey = new Date(state.activeShift.clockInTime).toDateString();
    dailyTotals.set(
      dayKey,
      (dailyTotals.get(dayKey) || 0) + (Date.now() - state.activeShift.clockInTime)
    );
  }

  const rows = [...dailyTotals.entries()]
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));

  if (rows.length === 0) {
    elements.weeklyDays.innerHTML =
      '<p class="weekly-empty">No hours recorded this week.</p>';
    elements.weeklyTotal.textContent = "0h 0m";
    return;
  }

  let weeklyTotal = 0;

  elements.weeklyDays.innerHTML = rows.map(([dayKey, milliseconds]) => {
    weeklyTotal += milliseconds;
    const label = new Date(dayKey).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric"
    });

    return `
      <div class="weekly-row">
        <span>${label}</span>
        <strong>${formatHoursMinutes(milliseconds)}</strong>
      </div>
    `;
  }).join("");

  elements.weeklyTotal.textContent = formatHoursMinutes(weeklyTotal);
}

function render() {
  const isClockedIn = Boolean(state.activeShift);

  elements.statusBadge.textContent = isClockedIn ? "ON DUTY" : "OFF DUTY";
  elements.statusBadge.classList.toggle("on", isClockedIn);
  elements.statusBadge.classList.toggle("off", !isClockedIn);

  elements.mainActionButton.textContent =
    isClockedIn ? "CLOCK OUT" : "CLOCK IN";
  elements.mainActionButton.classList.toggle("clock-out", isClockedIn);
  elements.mainActionButton.classList.toggle("clock-in", !isClockedIn);

  elements.sessionMessage.textContent = isClockedIn
    ? `Clocked in at ${formatTime(state.activeShift.clockInTime)}`
    : "You are not currently clocked in.";

  elements.actionHint.textContent = isClockedIn
    ? "Tap once to verify GPS and take your clock-out photo."
    : "Tap once to verify GPS and take your photo.";

  elements.mainActionButton.disabled = false;

  if (isClockedIn) {
    startTimer();
  } else {
    stopTimer();
    elements.sessionTimer.textContent = "00:00:00";
  }

  renderTicket();
  renderWeeklyHours();
}

elements.mainActionButton.addEventListener("click", () => {
  beginVerification(state.activeShift ? "clockOut" : "clockIn");
});

elements.resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("Reset all test time clock data?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  stopTimer();
  render();
  showToast("Test data has been reset.");
});

updateCurrentClock();
window.setInterval(updateCurrentClock, 1000);
render();
