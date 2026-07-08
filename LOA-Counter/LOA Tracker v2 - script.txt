const d=new Date();
document.getElementById('dayName').textContent=d.toLocaleDateString('en-US',{weekday:'long'});
document.getElementById('dateText').textContent=d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
// Existing counter logic from your current version should remain here.
