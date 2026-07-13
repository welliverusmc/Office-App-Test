// ticket.js
export function buildTicket(clockIn,clockOut){
  return {
    clockInTime:clockIn.clockInTime,
    clockOutTime:clockOut.clockOutTime,
    totalMilliseconds:clockOut.clockOutTime-clockIn.clockInTime,
    clockInLocation:clockIn.clockInLocation,
    clockOutLocation:clockOut.clockOutLocation
  };
}
