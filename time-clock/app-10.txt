// app.js (rename this file from app.txt to app.js)
// Time Clock Phase 1 - GPS + Timer

document.addEventListener("DOMContentLoaded", () => {
  const clockInButton = document.getElementById("clockInButton");
  const clockOutButton = document.getElementById("clockOutButton");
  const liveTimer = document.getElementById("liveTimer");

  let startTime = null;
  let timer = null;

  function format(ms) {
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, "0");
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const s = String(total % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function startTimer() {
    timer = setInterval(() => {
      liveTimer.textContent = format(Date.now() - startTime);
    }, 1000);
  }

  clockInButton.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition((position) => {
      console.log("Clock In:", position.coords);

      startTime = Date.now();
      clockInButton.disabled = true;
      clockOutButton.disabled = false;
      startTimer();
    });
  });

  clockOutButton.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition((position) => {
      console.log("Clock Out:", position.coords);

      clearInterval(timer);
      alert("Shift Complete\nTotal Time: " + format(Date.now() - startTime));

      clockInButton.disabled = false;
      clockOutButton.disabled = true;
      liveTimer.textContent = "00:00:00";
    });
  });
});
