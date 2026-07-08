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
  return date.toISOString().split("T")[0];
}

function getSavedData() {
  return JSON.parse(localStorage.getItem("loaCounterData")) || {};
}

function saveData(data) {
  localStorage.setItem("loaCounterData", JSON.stringify(data));
}

function getCurrentDayData() {
  const data = getSavedData();
  const key = getDateKey(selectedDate);

  if (!data[key]) {
    data[key] = {};
    metrics.forEach(metric => {
      data[key][metric] = 0;
    });
    saveData(data);
  }

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

    card.innerHTML = `
      <h3>${metric}</h3>
      <div class="counter-value">${dayData[metric] || 0}</div>
      <div class="counter-actions">
        <button class="secondary-btn" onclick="changeCount('${metric}', -1)">−</button>
        <button class="primary-btn" onclick="changeCount('${metric}', 1)">+</button>
      </div>
    `;

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
