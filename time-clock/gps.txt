// gps.js
export async function getCurrentLocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      p=>resolve({
        latitude:p.coords.latitude,
        longitude:p.coords.longitude,
        accuracy:p.coords.accuracy,
        capturedAt:Date.now()
      }),
      e=>reject(e),
      {enableHighAccuracy:true,timeout:15000,maximumAge:0}
    );
  });
}
