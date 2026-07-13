const STORAGE_KEY = "centralizedOfficeClockStateV1";

const elements = {
  statusBadge: document.getElementById("statusBadge"),
  todayLabel: document.getElementById("todayLabel"),
  currentTime: document.getElementById("currentTime"),
  sessionTimer: document.getElementById("sessionTimer"),
  sessionMessage: document.getElementById("sessionMessage"),
  locationStatus: document.getElementById("locationStatus"),
  locationButton: document.getElementById("locationButton"),
  photoInput: document.getElementById("photoInput"),
  photoStatus: document.getElementById("photoStatus"),
  photoPreviewWrap: document.getElementById("photoPreviewWrap"),
  photoPreview: document.getElementById("photoPreview"),
  removePhotoButton: document.getElementById("removePhotoButton"),
  mainActionButton: document.getElementById("mainActionButton"),
  actionHint: document.getElementById("actionHint"),
  ticketDate: document.getElementById("ticketDate"),
  ticketStatus: document.getElementById("ticketStatus"),
  ticketClockIn: document.getElementById("ticketClockIn"),
  ticketClockOut: document.getElementById("ticketClockOut"),
  ticketTotal: document.getElementById("ticketTotal"),
  gpsSummary: document.getElementById("gpsSummary"),
  photoSummary: document.getElementById("photoSummary"),
  resetButton: document.getElementById("resetButton"),
  toast: document.getElementById("toast")
};

let state = loadState();
let currentLocation = null;
let currentPhoto = null;
let timerHandle = null;

function createDefaultState() {
  return {
    clockedIn: false,
    activeShift: null,
    lastTicket: null
  };
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatClock(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatShortTime(timestamp) {
  if (!timestamp) return "--";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function formatDate(timestamp = Date.now()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(timestamp));
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2300);
}

function updateCurrentTime() {
  const now = new Date();
  elements.currentTime.textContent = formatClock(now);
  elements.todayLabel.textContent = formatDate(now);
}

function describeLocation(location) {
  if (!location) return "Not captured";
  const accuracy = Math.round(location.accuracy);
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} • ±${accuracy} m`;
}

function clearVerification() {
  currentLocation = null;
  currentPhoto = null;
  elements.photoInput.value = "";
  elements.photoPreview.removeAttribute("src");
  elements.photoPreviewWrap.classList.add("hidden");
}

function updateVerificationUI() {
  elements.locationStatus.textContent = describeLocation(currentLocation);

  if (currentPhoto) {
    elements.photoStatus.textContent = "Photo ready";
    elements.photoPreview.src = currentPhoto;
    elements.photoPreviewWrap.classList.remove("hidden");
  } else {
    elements.photoStatus.textContent = state.clockedIn
      ? "Required before clocking out"
      : "Required before clocking in";
    elements.photoPreviewWrap.classList.add("hidden");
  }

  const ready = Boolean(currentLocation && currentPhoto);
  elements.mainActionButton.disabled = !ready;
  elements.actionHint.textContent = ready
    ? `Ready to ${state.clockedIn ? "clock out" : "clock in"}.`
    : "Capture GPS and take a photo to continue.";
}

function updateStatusUI() {
  if (state.clockedIn && state.activeShift) {
    elements.statusBadge.textContent = "ON DUTY";
    elements.statusBadge.className = "status-badge on";
    elements.mainActionButton.textContent = "CLOCK OUT";
    elements.mainActionButton.className = "main-action clock-out";
    elements.sessionMessage.textContent = `Clocked in at ${formatShortTime(state.activeShift.clockInTime)}.`;
  } else {
    elements.statusBadge.textContent = "OFF DUTY";
    elements.statusBadge.className = "status-badge off";
    elements.mainActionButton.textContent = "CLOCK IN";
    elements.mainActionButton.className = "main-action clock-in";
    elements.sessionMessage.textContent = "You are not currently clocked in.";
    elements.sessionTimer.textContent = "00:00:00";
  }

  updateVerificationUI();
  updateTimer();
}

function updateTimer() {
  if (!state.clockedIn || !state.activeShift) return;
  const elapsed = Date.now() - state.activeShift.clockInTime;
  elements.sessionTimer.textContent = formatDuration(elapsed);
}

function renderTicket() {
  const ticket = state.lastTicket;

  if (!ticket) {
    elements.ticketDate.textContent = "No completed shift yet";
    elements.ticketStatus.textContent = "PENDING";
    elements.ticketStatus.className = "ticket-status";
    elements.ticketClockIn.textContent = "--";
    elements.ticketClockOut.textContent = "--";
    elements.ticketTotal.textContent = "00:00:00";
    elements.gpsSummary.textContent = "○ GPS verification";
    elements.photoSummary.textContent = "○ Photo verification";
    return;
  }

  elements.ticketDate.textContent = formatDate(ticket.clockInTime);
  elements.ticketStatus.textContent = "COMPLETE";
  elements.ticketStatus.className = "ticket-status complete";
  elements.ticketClockIn.textContent = formatShortTime(ticket.clockInTime);
  elements.ticketClockOut.textContent = formatShortTime(ticket.clockOutTime);
  elements.ticketTotal.textContent = formatDuration(ticket.clockOutTime - ticket.clockInTime);
  elements.gpsSummary.textContent = "✓ GPS verified at both punches";
  elements.photoSummary.textContent = "✓ Photos verified at both punches";
}

function requestLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported on this device.");
    return;
  }

  elements.locationButton.disabled = true;
  elements.locationButton.textContent = "Locating...";
  elements.locationStatus.textContent = "Requesting permission...";

  navigator.geolocation.getCurrentPosition(
    position => {
      currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: Date.now()
      };
      elements.locationButton.disabled = false;
      elements.locationButton.textContent = "Refresh GPS";
      updateVerificationUI();
      showToast("Location captured.");
    },
    error => {
      elements.locationButton.disabled = false;
      elements.locationButton.textContent = "Capture GPS";
      elements.locationStatus.textContent = "Location permission denied or unavailable";
      showToast(error.message || "Unable to capture location.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function handlePhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select or take an image.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    currentPhoto = reader.result;
    updateVerificationUI();
    showToast("Photo ready.");
  };
  reader.onerror = () => showToast("The photo could not be read.");
  reader.readAsDataURL(file);
}

function removePhoto() {
  currentPhoto = null;
  elements.photoInput.value = "";
  updateVerificationUI();
}

function clockIn() {
  const now = Date.now();

  state.clockedIn = true;
  state.activeShift = {
    clockInTime: now,
    clockInLocation: currentLocation,
    clockInPhoto: currentPhoto
  };

  saveState();
  clearVerification();
  updateStatusUI();
  showToast("Clocked in successfully.");
}

function clockOut() {
  const now = Date.now();
  const active = state.activeShift;

  state.lastTicket = {
    ...active,
    clockOutTime: now,
    clockOutLocation: currentLocation,
    clockOutPhoto: currentPhoto
  };

  state.clockedIn = false;
  state.activeShift = null;

  saveState();
  clearVerification();
  updateStatusUI();
  renderTicket();
  showToast("Clocked out successfully.");
}

function handleMainAction() {
  if (!currentLocation || !currentPhoto) {
    showToast("GPS and a photo are required.");
    return;
  }

  if (state.clockedIn) {
    clockOut();
  } else {
    clockIn();
  }
}

function resetData() {
  const confirmed = window.confirm("Reset the current shift and completed test ticket?");
  if (!confirmed) return;

  state = createDefaultState();
  saveState();
  clearVerification();
  updateStatusUI();
  renderTicket();
  elements.locationButton.textContent = "Capture GPS";
  showToast("Test data reset.");
}

elements.locationButton.addEventListener("click", requestLocation);
elements.photoInput.addEventListener("change", handlePhoto);
elements.removePhotoButton.addEventListener("click", removePhoto);
elements.mainActionButton.addEventListener("click", handleMainAction);
elements.resetButton.addEventListener("click", resetData);

updateCurrentTime();
updateStatusUI();
renderTicket();

window.setInterval(updateCurrentTime, 1000);
timerHandle = window.setInterval(updateTimer, 1000);
