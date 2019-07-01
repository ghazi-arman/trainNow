import firebase from 'firebase';

// Convert date to yyyy-mm-dd format for Agenda events
export function dateforAgenda(date){
  let month = '' + (date.getMonth() + 1);
  let day = '' + date.getDate();
  let year = date.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

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

// Checks if two date/time ranges overlap
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

// Loads user from user table in firebase
export async function loadUser(userKey){
  let returnValue;
  await firebase.database().ref('/users/' + userKey).once('value', function(snapshot) {
    let user = snapshot.val();
    user.key = snapshot.key;
    returnValue = user;
  });
  return returnValue;
}

// Loads accepted schedule from users table
export async function loadAcceptedSchedule(userKey){
  let sessions = [];
  await firebase.database().ref('/users/' + userKey + '/schedule/').once('value', function (snapshot) {
    snapshot.forEach(function (snapshot){
      let session = snapshot.val();
      session.text = 'Training Session'
      sessions.push(session);
    });
  });
  return sessions;
}

// Loads availability schedule from users table
export async function loadAvailableSchedule(userKey){
  let sessions = [];
  await firebase.database().ref('/users/' + userKey + '/availableschedule/').once('value', function (snapshot) {
    snapshot.forEach(function (snapshot){
      let session = snapshot.val();
      session.text = 'Open Availability'
      sessions.push(session);
    });
  });
  return sessions;
}

export async function addAvailableSession(trainerKey, startDate, endDate){
  firebase.database().ref('users/' + trainerKey + '/availableschedule/').push({
    start: startDate.toString(),
    end: endDate.toString()
  });
}

// Loads pending schedule from users table
export async function loadPendingSchedule(userKey){
  let sessions = [];
  await firebase.database().ref('/users/' + userKey + '/pendingschedule/').once('value', function (snapshot) {
    snapshot.forEach(function (snapshot){
      let session = snapshot.val();
      session.text = 'Pending Session'
      sessions.push(session);
    });
  });
  return sessions
}

// Loads complete session object of all pending sessions
export async function loadPendingSessions(userKey, userType){
  let sessions = [];
  let pendingRef = firebase.database().ref('pendingSessions');
  await pendingRef.orderByChild(userType).equalTo(userKey).once('value', function (data) {
    data.forEach(function (snapshot) {
      pendingSession = snapshot.val();
      pendingSession.key = snapshot.key;
      sessions.push(pendingSession);
    });
  }.bind(this));
  return sessions;
}

// Loads complete session object of all accepted sessions
export async function loadAcceptedSessions(userKey, userType){
  let sessions = [];
  let acceptedRef = firebase.database().ref('trainSessions');
  await acceptedRef.orderByChild(userType).equalTo(userKey).once('value', function (data) {
    data.forEach(function (snapshot) {
      acceptSession = snapshot.val();
      if (!acceptSession.end) {
        acceptSession.key = snapshot.key;
        sessions.push(acceptSession);
      }
    });
  }.bind(this));
  return sessions;
}

// Creates session in accepted sessions table in database and removes pending sessions
export async function createSession(session, sessionKey, startTime, endTime){
  // create session object in accepted sessions table
  firebase.database().ref('trainSessions').child(sessionKey).set({
    trainee: session.trainee,
    trainer: session.trainer,
    traineeName: session.traineeName,
    trainerName: session.trainerName,
    start: session.start,
    duration: session.duration,
    location: session.location,
    rate: session.rate,
    gym: session.gym,
    sentBy: session.sentBy,
    traineeStripe: session.traineeStripe,
    trainerStripe: session.trainerStripe,
    traineePhone: session.traineePhone,
    trainerPhone: session.trainerPhone,
    trainerReady: false,
    traineeReady: false,
    met: false,
    read: false,
    traineeEnd: false,
    trainerEnd: false,
  });

  // remove session from pending sessions table and from pending schedule of trainer and trainee
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
	firebase.database().ref('/users/' + session.trainee + '/pendingschedule/').child(sessionKey).remove();
  firebase.database().ref('/users/' + session.trainer + '/pendingschedule/').child(sessionKey).remove();

  // add session to trainer's and trainee's schedule
  firebase.database().ref('users/' + session.trainee + '/schedule/').child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString()
  });
  firebase.database().ref('users/' + session.trainer + '/schedule/').child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString()
  });
}

// Removes pending session from sessions table and schedules
export async function cancelPendingSession(session, sessionKey){
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  firebase.database().ref('/users/' + session.trainee + '/pendingschedule/').child(sessionKey).remove();
  firebase.database().ref('/users/' + session.trainer + '/pendingschedule/').child(sessionKey).remove();
}

// Removes accepted session from sessions table and schedules and stores it in canceled sessions table
export async function cancelAcceptedSession(session, sessionKey){
  firebase.database().ref('cancelSessions').push(session);
  firebase.database().ref('trainSessions').child(sessionKey).remove();
  firebase.database().ref('/users/' + session.trainee + '/schedule/').child(sessionKey).remove();
  firebase.database().ref('/users/' + session.trainer + '/schedule/').child(sessionKey).remove();
}

// Sends text message using twilio
export async function sendMessage(number, message){
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
    method: 'POST',
    headers: {
      Authorization: idToken
    },
    body: JSON.stringify({
      phone: number,
      message: message,
      user: firebase.auth().currentUser.uid
    }),
  });
  const data = await res.json();
  data.body = JSON.parse(data.body);
  return data;
}

export async function createPendingSession(trainee, trainer, gym, date, duration, sentBy){
  var sessionKey = firebase.database().ref('pendingSessions').push({
    trainee: trainee.uid,
    traineeName: trainee.name,
    trainer: trainer.key,
    trainerName: trainer.name,
    start: date.toString(),
    duration: duration,
    location: gym.location,
    gym: gym.name,
    rate: trainer.rate,
    read: false,
    traineeStripe: trainee.stripeId,
    trainerStripe: trainer.stripeId,
    traineePhone: trainee.phone,
    trainerPhone: trainer.phone,
    sentBy
  }).key;
  let end = new Date(new Date(date).getTime() + (60000 * duration))
  firebase.database().ref('users/' + trainee.uid + '/pendingschedule/').child(sessionKey).set({
    start: date.toString(),
    end: end.toString()
  });
  firebase.database().ref('users/' + trainer.key + '/pendingschedule/').child(sessionKey).set({
    start: date.toString(),
    end: end.toString()
  });
}

export async function loadGym(gymKey) {
  let gym;
  await firebase.database().ref('gyms').child(gymKey).once('value', function (snapshot) {
    gym = snapshot.val()
  });
  return gym;
}