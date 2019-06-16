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