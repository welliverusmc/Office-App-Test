const STORAGE_KEY = "centralizedOfficeTimeClockV2";

const elements = {
  statusBadge: document.getElementById("statusBadge"),
  todayLabel: document.getElementById("todayLabel"),
  currentTime: document.getElementById("currentTime"),
  sessionTimer: document.getElementById("sessionTimer"),
  sessionMessage: document.getElementById("sessionMessage"),
  locationStatus: document.getElementById("locationStatus"),
  photoStatus: document.getElementById("photoStatus"),
  mainActionButton: document.getElementById("mainActionButton"),
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

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
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
  elements.locationStatus.textContent = "Requesting GPS...";
  elements.photoStatus.textContent = "Waiting for photo...";

  try {
    pendingLocation = await requestLocation();
    elements.locationStatus.textContent =
      `Verified within ${Math.round(pendingLocation.accuracy)} m`;

    setBusy(true, "Opening the camera...");
    elements.photoStatus.textContent = "Camera opening...";

    const photo = await requestPhoto();
    elements.photoStatus.textContent = "Photo verified";

    if (actionType === "clockIn") {
      completeClockIn(pendingLocation, photo);
    } else {
      completeClockOut(pendingLocation, photo);
    }
  } catch (error) {
    showToast(error.message);
    elements.locationStatus.textContent = "Captured automatically";
    elements.photoStatus.textContent = "Requested automatically";
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
  showToast("Clock-out complete.");
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

  elements.locationStatus.textContent = "Captured automatically";
  elements.photoStatus.textContent = "Requested automatically";

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

updateCurrentClock();
window.setInterval(updateCurrentClock, 1000);
render();
