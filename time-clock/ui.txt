// ui.js
export function setStatus(text){
  const el=document.getElementById("statusBadge");
  if(el) el.textContent=text;
}
export function updateTimer(text){
  const el=document.getElementById("liveTimer");
  if(el) el.textContent=text;
}
