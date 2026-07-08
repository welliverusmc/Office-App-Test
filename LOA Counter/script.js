const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

document.addEventListener('DOMContentLoaded', () => {
  const title = document.getElementById('dayTitle');
  if (title) {
    title.textContent = days[new Date().getDay()] + ' Counter';
  }
});

function change(id, delta) {
  const element = document.getElementById(id);
  let value = parseInt(element.textContent) || 0;
  value = Math.max(0, value + delta);
  element.textContent = value;
}
