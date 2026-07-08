const counters = [
  "pitches",
  "stories",
  "value",
  "tables",
  "ccs",
  "closes"
];

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getStoredData() {
  try {
    return JSON.parse(localStorage.getItem("loaTrackerData")) || {};
  } catch {
    return {};
  }
}

function saveStoredData(data) {
  localStorage.setItem("loaTrackerData", JSON.stringify(data));
}

function getTodayData() {
  const allData = getStoredData();
  const todayKey = getTodayKey();

  if (!allData[todayKey]) {
    allData[todayKey] = {};
  }

  counters.forEach((counter) => {
    if (typeof allData[todayKey][counter] !== "number") {
      allData[todayKey][counter] = 0;
    }
  });

  saveStoredData(allData);
  return allData[todayKey];
}

function saveTodayData(todayData) {
  const allData = getStoredData();
  allData[getTodayKey()] = todayData;
  saveStoredData(allData);
}

function renderCounts(todayData) {
  counters.forEach((counter) => {
    const element = document.getElementById(`${counter}-count`);
    if (element) {
      element.textContent = todayData[counter];
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const dayTitle = document.getElementById("day-title");
  dayTitle.textContent = `${getDayName()} Counter`;

  const todayData = getTodayData();
  renderCounts(todayData);

  document.querySelectorAll(".counter-card").forEach((card) => {
    const counterName = card.dataset.counter;

    card.querySelectorAll(".counter-button").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "plus") {
          todayData[counterName] += 1;
        }

        if (action === "minus") {
          todayData[counterName] = Math.max(0, todayData[counterName] - 1);
        }

        saveTodayData(todayData);
        renderCounts(todayData);
      });
    });
  });
});
