const counters = [
  "pitches",
  "shortStories",
  "valueStatements",
  "tables",
  "creditChecks",
  "closes"
];

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem("loaTrackerData")) || {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem("loaTrackerData", JSON.stringify(data));
}

function getTodayData() {
  const allData = loadData();
  const todayKey = getTodayKey();

  if (!allData[todayKey]) {
    allData[todayKey] = {};
  }

  counters.forEach((counter) => {
    if (typeof allData[todayKey][counter] !== "number") {
      allData[todayKey][counter] = 0;
    }
  });

  saveData(allData);
  return allData[todayKey];
}

function saveTodayData(todayData) {
  const allData = loadData();
  allData[getTodayKey()] = todayData;
  saveData(allData);
}

function render(todayData) {
  counters.forEach((counter) => {
    const element = document.getElementById(`${counter}-count`);
    if (element) {
      element.textContent = todayData[counter];
    }
  });
}

function resetTodayData(todayData) {
  counters.forEach((counter) => {
    todayData[counter] = 0;
  });

  saveTodayData(todayData);
  render(todayData);
}

document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();

  document.getElementById("dayName").textContent = now.toLocaleDateString("en-US", {
    weekday: "long"
  });

  document.getElementById("dateText").textContent = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const todayData = getTodayData();
  render(todayData);

  document.querySelectorAll(".tracker-card").forEach((card) => {
    const key = card.dataset.key;

    card.querySelectorAll(".counter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "plus") {
          todayData[key] += 1;
        }

        if (action === "minus") {
          todayData[key] = Math.max(0, todayData[key] - 1);
        }

        saveTodayData(todayData);
        render(todayData);
      });
    });
  });

  const resetButton = document.getElementById("resetTodayBtn");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const confirmed = window.confirm("Reset today's LOA Tracker counts to zero?");
      if (confirmed) {
        resetTodayData(todayData);
      }
    });
  }
});
