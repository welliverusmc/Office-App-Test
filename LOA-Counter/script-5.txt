const counters=["pitches","stories","value","tables","ccs","closes"];

function getTodayKey(){
  const now=new Date();
  const year=now.getFullYear();
  const month=String(now.getMonth()+1).padStart(2,"0");
  const day=String(now.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function getDayName(){
  return new Date().toLocaleDateString("en-US",{weekday:"long"});
}

function loadAllData(){
  return JSON.parse(localStorage.getItem("loaTrackerData")||"{}");
}

function saveAllData(data){
  localStorage.setItem("loaTrackerData",JSON.stringify(data));
}

function getTodayData(){
  const allData=loadAllData();
  const todayKey=getTodayKey();

  if(!allData[todayKey]) allData[todayKey]={};

  counters.forEach((key)=>{
    if(typeof allData[todayKey][key]!=="number") allData[todayKey][key]=0;
  });

  saveAllData(allData);
  return allData[todayKey];
}

function saveTodayData(todayData){
  const allData=loadAllData();
  allData[getTodayKey()]=todayData;
  saveAllData(allData);
}

function render(todayData){
  counters.forEach((key)=>{
    document.getElementById(key).textContent=todayData[key];
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("dayTitle").textContent=`${getDayName()} Counter`;

  const todayData=getTodayData();
  render(todayData);

  document.querySelectorAll(".counter-card").forEach((card)=>{
    const key=card.dataset.key;

    card.querySelectorAll(".counter-btn").forEach((button)=>{
      button.addEventListener("click",()=>{
        const action=button.dataset.action;

        if(action==="plus") todayData[key]+=1;
        if(action==="minus") todayData[key]=Math.max(0,todayData[key]-1);

        saveTodayData(todayData);
        render(todayData);
      });
    });
  });
});
