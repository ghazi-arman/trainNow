  // Convert date to readable format
  export function dateToString(start) {
    var pendingDate = new Date(start);
    var month = pendingDate.getMonth() + 1;
    var day = pendingDate.getDate();
    var hour = pendingDate.getHours();
    var minute = pendingDate.getMinutes();
    var abbr;

    if (minute < 10) {
      minute = '0' + minute;
    }
    // Sets abbr to AM or PM
    if (hour > 12) {
      hour = hour - 12;
      abbr = 'PM';
    } else {
      abbr = 'AM'
    }

    var displayDate = month + '-' + day + ' ' + hour + ':' + minute + abbr;
    return displayDate;
  }

  export function timeOverlapCheck(sessionOneStart, sessionOneEnd, sessionTwoStart, sessionTwoEnd){
    let startOne = new Date(sessionOneStart).getTime();
    let startTwo = new Date(sessionTwoStart).getTime();
    let endOne = new Date(sessionOneEnd).getTime();
    let endTwo = new Date(sessionTwoEnd).getTime();

    if (startOne > startTwo && startOne < endTwo || startTwo > startOne && startTwo < endOne) {
      return true;
    }
    return false;
  }