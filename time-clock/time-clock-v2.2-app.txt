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
    latestTicket: null
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved || defaultState();
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

function requestLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: Date.now()
      }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("Location permission was denied."));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("The GPS request timed out."));
        } else {
          reject(new Error("Your location could not be captured."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
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
  setBusy(true, "Capturing GPS location...");
  showToast("Requesting GPS location...", 0);

  try {
    pendingLocation = await requestLocation();

    setBusy(true, "Opening the camera...");
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
    setBusy(false, state.activeShift
      ? "Tap once to verify GPS and take your clock-out photo."
      : "Tap once to verify GPS and take your photo.");
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
  state.activeShift = null;

  saveState();
  stopTimer();
  render();
  showToast("You have successfully clock out.");
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
  timerHandle = window.setInterval(tick, 1000);
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
