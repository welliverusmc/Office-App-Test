const metrics = [
  "Pitches",
  "Stories",
  "Value",
  "Tables",
  "CCs",
  "Closes"
];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let selectedDate = new Date();

const dayTitle = document.getElementById("dayTitle");
const selectedDayLabel = document.getElementById("selectedDayLabel");
const counterGrid = document.getElementById("counterGrid");
const totalCount = document.getElementById("totalCount");
const prevDayBtn = document.getElementById("prevDayBtn");
const nextDayBtn = document.getElementById("nextDayBtn");
const resetBtn = document.getElementById("resetBtn");

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSavedData() {
  try {
    return JSON.parse(localStorage.getItem("loaCounterData")) || {};
  } catch (error) {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem("loaCounterData", JSON.stringify(data));
}

function getCurrentDayData() {
  const data = getSavedData();
  const key = getDateKey(selectedDate);

  if (!data[key]) {
    data[key] = {};
  }

  metrics.forEach(metric => {
    if (typeof data[key][metric] !== "number") {
      data[key][metric] = 0;
    }
  });

  saveData(data);
  return data[key];
}

function updateHeader() {
  const today = new Date();
  const isToday = getDateKey(today) === getDateKey(selectedDate);

  dayTitle.textContent = `${days[selectedDate.getDay()]} Counter`;
  selectedDayLabel.textContent = isToday ? "Today" : selectedDate.toLocaleDateString();
}

function updateTotal(dayData) {
  const total = metrics.reduce((sum, metric) => sum + Number(dayData[metric] || 0), 0);
  totalCount.textContent = total;
}

function changeCount(metric, amount) {
  const data = getSavedData();
  const key = getDateKey(selectedDate);

  if (!data[key]) {
    data[key] = {};
  }

  const current = Number(data[key][metric] || 0);
  data[key][metric] = Math.max(0, current + amount);

  saveData(data);
  renderCounters();
}

function renderCounters() {
  const dayData = getCurrentDayData();

  counterGrid.innerHTML = "";

  metrics.forEach(metric => {
    const card = document.createElement("div");
    card.className = "counter-card";

    const title = document.createElement("h3");
    title.textContent = metric;

    const value = document.createElement("div");
    value.className = "counter-value";
    value.textContent = dayData[metric] || 0;

    const actions = document.createElement("div");
    actions.className = "counter-actions";

    const minusBtn = document.createElement("button");
    minusBtn.className = "secondary-btn";
    minusBtn.textContent = "−";
    minusBtn.addEventListener("click", () => changeCount(metric, -1));

    const plusBtn = document.createElement("button");
    plusBtn.className = "primary-btn";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => changeCount(metric, 1));

    actions.appendChild(minusBtn);
    actions.appendChild(plusBtn);

    card.appendChild(title);
    card.appendChild(value);
    card.appendChild(actions);

    counterGrid.appendChild(card);
  });

  updateHeader();
  updateTotal(dayData);
}

prevDayBtn.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  renderCounters();
});

nextDayBtn.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() + 1);
  renderCounters();
});

resetBtn.addEventListener("click", () => {
  const confirmReset = confirm("Reset all counters for this day?");
  if (!confirmReset) return;

  const data = getSavedData();
  const key = getDateKey(selectedDate);

  data[key] = {};
  metrics.forEach(metric => {
    data[key][metric] = 0;
  });

  saveData(data);
  renderCounters();
});

renderCounters();
