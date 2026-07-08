const metrics = ["Pitches", "Stories", "Value", "Tables", "CCs", "Closes"];
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
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem("loaCounterData", JSON.stringify(data));
}

function ensureDayData() {
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
  const total = metrics.reduce((sum, metric) => sum + dayData[metric], 0);
  totalCount.textContent = total;
}

function changeCount(metric, amount) {
  const data = getSavedData();
  const key = getDateKey(selectedDate);

  if (!data[key]) {
    data[key] = {};
  }

  const currentValue = Number(data[key][metric] || 0);
  data[key][metric] = Math.max(0, currentValue + amount);

  saveData(data);
  renderCounters();
}

function renderCounters() {
  const dayData = ensureDayData();

  counterGrid.innerHTML = "";

  metrics.forEach(metric => {
    const card = document.createElement("article");
    card.className = "counter-card";

    card.innerHTML = `
      <h3>${metric}</h3>
      <div class="counter-value">${dayData[metric]}</div>
      <div class="counter-actions">
        <button class="secondary-btn" type="button" aria-label="Subtract one ${metric}" data-metric="${metric}" data-change="-1">−</button>
        <button class="primary-btn" type="button" aria-label="Add one ${metric}" data-metric="${metric}" data-change="1">+</button>
      </div>
    `;

    counterGrid.appendChild(card);
  });

  updateHeader();
  updateTotal(dayData);
}

counterGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-metric]");
  if (!button) return;

  const metric = button.dataset.metric;
  const amount = Number(button.dataset.change);

  changeCount(metric, amount);
});

prevDayBtn.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  renderCounters();
});

nextDayBtn.addEventListener("click", () => {
  selectedDate.setDate(selectedDate.getDate() + 1);
  renderCounters();
});

resetBtn.addEventListener("click", () => {
  const shouldReset = confirm("Reset all counters for this day?");
  if (!shouldReset) return;

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
