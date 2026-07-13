// timer.js
let interval=null;
export function startTimer(startTime,onTick){
  stopTimer();
  const tick=()=>onTick(Date.now()-startTime);
  tick();
  interval=setInterval(tick,1000);
}
export function stopTimer(){
  if(interval){clearInterval(interval);interval=null;}
}
