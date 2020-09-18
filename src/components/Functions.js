import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import geolib from 'geolib';
import { Actions } from 'react-native-router-flux';
import { FB_URL } from 'react-native-dotenv';
import Constants from './Constants';

/**
 * Converts a date object into yyyy-mm-dd string format.
 * @param {Date} date date object to format
 * @return {string} formatted string
 */
export function dateforAgenda(date) {
  let month = `${date.getMonth() + 1}`;
  let day = `${date.getDate()}`;
  const year = date.getFullYear();

  month = month.length < 2 ? `0${month}` : month;
  day = day.length < 2 ? `0${day}` : day;

  return [year, month, day].join('-');
}

/**
 * Converts a datetime string into the string format (mm/dd hh:mm AM/PM).
 * @param {string} date datetime string
 * @return {string} formatted string
 */
export function dateToString(date) {
  const pendingDate = new Date(date);
  const month = pendingDate.getMonth() + 1;
  const day = pendingDate.getDate();
  let hour = pendingDate.getHours();
  let minute = pendingDate.getMinutes();
  let abbr;

  if (minute < 10) {
    minute = `0${minute}`;
  }

  if (hour > 12) {
    hour -= 12;
    abbr = ' PM';
  } else {
    if (hour === 0) {
      hour = 12;
    }
    abbr = ' AM';
  }

  return `${month}/${day} ${hour}:${minute}${abbr}`;
}

/**
 * Converts a Date string to a string format for its time (hh:mm AM/PM).
 * @param {string} date datetime string
 * @return {string} formatted string
 */
export function dateToTime(date) {
  const pendingDate = new Date(date);
  let hour = pendingDate.getHours();
  let minute = pendingDate.getMinutes();
  let abbr;

  if (minute < 10) {
    minute = `0${minute}`;
  }

  if (hour > 12) {
    hour -= 12;
    abbr = ' PM';
  } else {
    if (hour === 0) {
      hour = 12;
    }
    abbr = ' AM';
  }

  const displayDate = `${hour}:${minute}${abbr}`;
  return displayDate;
}

/**
 * Checks if there is an overlap between two sessions using their start and end times.
 * @param {string} sessionOneStart datetime string of first session's start time
 * @param {string} sessionOneEnd datetime string of second session's end time
 * @param {string} sessionTwoStart datetime string of second session's start time
 * @param {string} sessionTwoEnd datetime string of second session's end time
 * @return {boolean} returns true if there is an overlap between the two sessions, false otherwise
 */
export function timeOverlapCheck(sessionOneStart, sessionOneEnd, sessionTwoStart, sessionTwoEnd) {
  const startOne = new Date(sessionOneStart).getTime();
  const startTwo = new Date(sessionTwoStart).getTime();
  const endOne = new Date(sessionOneEnd).getTime();
  const endTwo = new Date(sessionTwoEnd).getTime();

  if ((startOne > startTwo && startOne < endTwo) || (startTwo > startOne && startTwo < endOne)) {
    return true;
  }
  return false;
}

/**
 * Retrieves a specific user from the users table in firebase
 * @param {string} userKey firebase key associated with the user
 * @return {User} user associated with the key if it exists
 */
export async function loadUser(userKey) {
  const user = (await firebase.database().ref(`/users/${userKey}`).once('value')).val();
  user.userKey = userKey;
  return user;
}

/**
 * Retrieves a user's accepted schedule (sessions already accepted) from the users table.
 * @param {string} userKey firebase key associated with the user
 * @returns {Array[Schedule]} sessions already accepted by the user that have yet to happen
 */
export async function loadAcceptedSchedule(userKey) {
  const sessions = [];
  await firebase.database().ref(`/users/${userKey}/schedule/`).once('value', (snapshot) => {
    snapshot.forEach((sessionRef) => {
      const session = sessionRef.val();
      session.text = 'Training Session';
      sessions.push(session);
    });
  });
  return sessions;
}

/**
 * Retrieves a user's (trainer) available schedule (open time slots) from the users table.
 * @param {string} userKey firebase key associated with the user
 * @returns {Array[Schedule]} available schedule of the user
 */
export async function loadAvailableSchedule(userKey) {
  const sessions = [];
  await firebase.database().ref(`/users/${userKey}/availableSchedule/`).once('value', (snapshot) => {
    snapshot.forEach((sessionRef) => {
      const session = sessionRef.val();
      session.text = 'Open Availability';
      sessions.push(session);
    });
  });
  return sessions;
}

/**
 * Adds a time slot to the user's available schedule.
 * @param {*} userKey firebase key associated with the user
 * @param {*} startDate datetime string of the start of the available time slot
 * @param {*} endDate datetime string of the end of the available time slot
 */
export async function addAvailableSession(userKey, startDate, endDate) {
  firebase.database().ref(`users/${userKey}/availableSchedule/`).push({
    start: startDate.toString(),
    end: endDate.toString(),
  });
}

/**
 * Retrieves a user's pending schedule (sessions not accepted) from the users table.
 * @param {string} userKey firebase key associated with the user
 * @returns {Array[Schedule]} requested sessions not accepted by the user yet
 */
export async function loadPendingSchedule(userKey) {
  const sessions = [];
  await firebase.database().ref(`/users/${userKey}/pendingschedule/`).once('value', (snapshot) => {
    snapshot.forEach((sessionRef) => {
      const session = sessionRef.val();
      session.text = 'Pending Session';
      sessions.push(session);
    });
  });
  return sessions;
}

/**
 * Returns all the pending sessions belonging to the user from the pendingSessions table.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {Array[Session]} requested sessions (with all its info) not accepted by the user yet
 */
export async function loadPendingSessions(userKey, userType) {
  const sessions = [];
  const pendingRef = firebase.database().ref('pendingSessions');
  await pendingRef.orderByChild(`${userType}Key`).equalTo(userKey).once('value', (data) => {
    data.forEach((snapshot) => {
      const pendingSession = snapshot.val();
      pendingSession.key = snapshot.key;
      sessions.push(pendingSession);
    });
  });
  return sessions;
}

/**
 * Returns all the accepted sessions belonging to the user from the pendingSessions table.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {Array[Session]} accepted sessions (with all its info) that involve the user
 */
export async function loadAcceptedSessions(userKey, userType) {
  const sessions = [];
  const sessionDatabase = firebase.database().ref('trainSessions');
  await sessionDatabase.orderByChild(`${userType}Key`).equalTo(userKey).once('value', (data) => {
    data.forEach((snapshot) => {
      const session = snapshot.val();
      if (!session.end) {
        session.key = snapshot.key;
        sessions.push(session);
      }
    });
  });
  return sessions;
}

/**
 * Returns the specified group session using the key from the groupSessions table in firebase.
 * @param {string} sessionKey firebase key associated with the session
 * @return {GroupSession} group session associated with the key if it exists
 */
export async function loadGroupSession(sessionKey) {
  const session = (await firebase.database().ref(`groupSessions/${sessionKey}`).once('value')).val();
  session.key = sessionKey;
  return session;
}

/**
 * Returns all the group sessions belonging to the user from the groupSessions table in firebase.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {Array[GroupSession]} group sessions (with all its info) that involve the user
 */
export async function loadGroupSessions(userKey, userType) {
  const sessions = [];
  const groupSessionDatabase = firebase.database().ref('groupSessions');
  if (userType === Constants.trainerType) {
    await groupSessionDatabase.orderByChild('trainerKey').equalTo(userKey).once('value', (data) => {
      data.forEach((snapshot) => {
        const session = snapshot.val();
        if (!session.end) {
          session.key = snapshot.key;
          sessions.push(session);
        }
      });
    });
  }
  if (userType === Constants.clientType) {
    const sessionKeys = [];
    await firebase.database().ref(`/users/${userKey}/schedule`).once('value', (data) => {
      data.forEach((snapshot) => {
        const sessionType = snapshot.val().type;
        if (sessionType === Constants.groupSessionType) {
          sessionKeys.push(snapshot.key);
        }
      });
    });
    // eslint-disable-next-line
    for (const key of sessionKeys) {
      // eslint-disable-next-line
      const session = await loadGroupSession(key);
      if (session && !session.end) {
        session.key = key;
        sessions.push(session);
      }
    }
  }
  return sessions;
}

/**
 * Called when a session is accepted. This adds the session to the trainSession table in firebase
 * and removes the pending session from the pendingSession table. It also adds the session to the
 * schedule of the trainer and the client.
 * @param {Session} session Session object of pending session
 * @param {string} sessionKey firebase key associated with the session
 * @param {string} startTime datetime string of session's start time
 * @param {string} endTime datetime string of session's end time
 */
export async function createSession(session, sessionKey, startTime, endTime) {
  const userId = firebase.auth().currentUser.uid;
  const userStripeField = (session.sentBy === 'trainer') ? 'clientStripe' : 'trainerStripe';
  const otherUserStripeField = (session.sentBy === 'trainer') ? 'trainerStripe' : 'clientStripe';
  const otherUserStripe = (session.sentBy === 'trainer') ? session.trainerStripe : session.clientStripe;
  const user = await loadUser(userId);

  firebase.database().ref('trainSessions').child(sessionKey).set({
    clientKey: session.clientKey,
    trainerKey: session.trainerKey,
    clientName: session.clientName,
    trainerName: session.trainerName,
    start: session.start,
    duration: session.duration,
    location: session.virtual ? session.location : null,
    rate: session.rate,
    gymName: session.gymName,
    gymKey: session.gymKey,
    sentBy: session.sentBy,
    regular: session.regular,
    [userStripeField]: user.stripeId,
    [otherUserStripeField]: otherUserStripe,
    clientPhone: session.clientPhone,
    trainerPhone: session.trainerPhone,
    read: false,
    trainerType: session.trainerType,
    type: session.type,
    virtual: session.virtual,
  });

  const otherUserKey = (userId === session.clientKey) ? session.trainerKey : session.clientKey;

  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  firebase.database().ref(`/users/${otherUserKey}/pendingschedule/`).child(sessionKey).remove();

  firebase.database().ref(`users/${userId}/schedule/`).child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString(),
    type: Constants.personalSessionType,
  });

  firebase.database().ref(`users/${otherUserKey}/schedule/`).child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString(),
    type: Constants.personalSessionType,
  });
}

/**
 * Cancels the pending session by removing the session from the pendingSessions table in firebase.
 * It also removes the session from the schedule of the user who created it.
 * @param {Session} session session object of the pending session
 * @param {*} sessionKey firebase key associated with the session
 */
export async function cancelPendingSession(session, sessionKey) {
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  const userSentBy = (session.sentBy === 'client') ? session.clientKey : session.trainerKey;
  firebase.database().ref(`/users/${userSentBy}/pendingschedule/`).child(sessionKey).remove();
}

/**
 * Cancels the accepted session by removing the session from the trainSessions table in firebase.
 * It also removes the session from the schedule of the trainer and the client.
 * The session is placed in the cancelSessions table in case it is needed for
 * any review in the future.
 * @param {Session} session session object of the accepted session
 */
export async function cancelAcceptedSession(session) {
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref('cancelSessions').child(userId).push(session);
  firebase.database().ref('trainSessions').child(session.key).remove();
  firebase.database().ref(`/users/${session.clientKey}/schedule/`).child(session.key).remove();
  firebase.database().ref(`/users/${session.trainerKey}/schedule/`).child(session.key).remove();
}

/**
 * Cancels the group session by removing the session from the groupSessions table in firebase.
 * It also removes the session from the schedule of the user.
 * The session is also removed from the gyms table where it is stored for denormalization reasons.
 * @param {Session} session session object of the group session
 */
export async function cancelGroupSession(session) {
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref('cancelSessions').child(userId).push(session);
  firebase.database().ref('groupSessions').child(session.key).remove();
  firebase.database().ref(`/gyms/${session.gymKey}/groupSessions/${session.key}`).remove();
  firebase.database().ref(`/users/${session.trainer}/schedule/`).child(session.key).remove();
  if (session.clients) {
    Object.keys(session.clients).forEach((key) => {
      firebase.database().ref(`/users/${key}/schedule/`).child(session.key).remove();
    });
  }
}

/**
 * Allows client to leave the group session by modifying the clients section
 * of session in groupSessions table. It also removes the session from the schedule of the user.
 * @param {Session} session session object of the group session
 */
export async function leaveGroupSession(session) {
  const userId = firebase.auth().currentUser.uid;
  const currentClientCount = (await firebase.database().ref(`groupSessions/${session.key}/clientCount`).once('value')).val();
  firebase.database().ref(`/groupSessions/${session.key}/clients/${userId}`).remove();
  firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clients/${userId}`).remove();
  await firebase.database().ref(`groupSessions/${session.key}/clientCount`).set(currentClientCount - 1);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clientCount`).set(currentClientCount - 1);
  firebase.database().ref(`/users/${userId}/schedule/`).child(session.key).remove();
}

/**
 * Sends a text message to the specified phone number with the specified message by calling a
 * firebase cloud function which uses the Twilio API.
 * @param {string} number phone number to send text message to
 * @param {string} message message content of text message
 */
export async function sendMessage(number, message) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/twilio/sendMessage/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      phone: number,
      message,
      uid: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  return response;
}

/**
 * Gets the current location of the user.
 * @returns {Location} location object of the user's location
 */
export async function getLocation() {
  const location = Platform.OS === 'ios'
    ? await Location.getCurrentPositionAsync()
    : await Location.getCurrentPositionAsync({ enableHighAccuracy: true });

  return {
    latitude: Number(JSON.stringify(location.coords.latitude)),
    longitude: Number(JSON.stringify(location.coords.longitude)),
    latitudeDelta: 0.0422,
    longitudeDelta: 0.0221,
  };
}

/**
 * Retrieves the specified gym from the gyms table using the gymKey.
 * @param {string} gymKey firebase key associated with the gym
 * @returns {Gym} gym object associated with the key if it exists
 */
export async function loadGym(gymKey) {
  let gym;
  const userRegion = await getLocation();
  await firebase.database().ref('gyms').child(gymKey).once('value', (snapshot) => {
    gym = snapshot.val();
    if (gym.virtual) {
      gym.location = userRegion;
    }
    gym.key = gymKey;
  });
  return gym;
}

/**
 * Creates a session in the pendingSession table in firebase and also adds the session to the
 * schedule of the user who created it.
 * @param {User} client client to be trained during the session
 * @param {User} trainer trainer invovled with the session
 * @param {string} gymKey firebase key associated with the gym where session takes place
 * @param {string} date datetime string of session's start time
 * @param {string} duration duration in minutes of the session
 * @param {string} sentBy which user (client, trainer) who created the session
 * @param {boolean} regular boolean which indicates if the client is a regular client of the trainer
 */
export async function createPendingSession(
  client,
  trainer,
  gymKey,
  date,
  duration,
  sentBy,
  regular,
) {
  const gym = await loadGym(gymKey);
  const userStripeField = (sentBy === Constants.clientType) ? 'clientStripe' : 'trainerStripe';
  const userStripe = (sentBy === Constants.clientType) ? client.stripeId : trainer.stripeId;
  const sessionKey = firebase.database().ref('pendingSessions').push({
    clientKey: client.userKey,
    clientName: client.name,
    trainerKey: trainer.userKey,
    trainerName: trainer.name,
    start: date.toString(),
    duration,
    location: gym.location ? gym.location : null,
    gymName: gym.name,
    gymKey: gym.key,
    rate: trainer.rate,
    read: false,
    [userStripeField]: userStripe,
    clientPhone: client.phone,
    trainerPhone: trainer.phone,
    trainerType: trainer.trainerType,
    sentBy,
    regular,
    type: Constants.personalSessionType,
    virtual: gym.virtual ? gym.virtual : false,
  }).key;
  const end = new Date(new Date(date).getTime() + (60000 * duration));
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref(`users/${userId}/pendingschedule/`).child(sessionKey).set({
    start: date.toString(),
    end: end.toString(),
    type: Constants.personalSessionType,
  });
}

/**
 * Creates an array of icons which corresponds to the rating that is specified.
 * @param {number} rating how many stars to render
 * @returns {Array[FontAwesome]} array of FontAwesome icons that represent the rating
 */
export function renderStars(rating) {
  let ratingRemaining = rating;
  const star = [];
  for (let stars = 0; stars < 5; stars += 1) {
    if (ratingRemaining >= 1) {
      star.push(<FontAwesome key={stars} name="star" size={15} />);
    } else if (rating > 0) {
      star.push(<FontAwesome key={stars} name="star-half-full" size={15} />);
    } else {
      star.push(<FontAwesome key={stars} name="star-o" size={15} />);
    }
    ratingRemaining -= 1;
  }
  return star;
}

/**
 * Retrieves any users that have recently been trained or have trained with the
 * user passed in (depending on the type).
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @return {Array[Object]} returns an array of users along with the gym and date of interaction
 */
export async function loadRecentUsers(userKey, userType) {
  const users = [];
  const userMap = [];
  const user = await loadUser(userKey);
  const pastSessions = await firebase.database().ref(`pastSessions/${userKey}`).once('value');
  pastSessions.forEach((sessionValue) => {
    const { session } = sessionValue.val();
    if (
      session[`${userType}Key`]
      && !userMap.includes(session[`${userType}Key`])
      && !(user.trainers && user.trainers[session[`${userType}Key`]])
      && !(user.clients && user.clients[session[`${userType}Key`]])
      && !(user.requests && user.requests[session[`${userType}Key`]])
    ) {
      users.push({
        name: session[`${userType}Name`],
        userKey: session[`${userType}Key`],
        date: session.start,
        gymName: session.gymName,
        gymKey: session.gymKey,
      });
      userMap.push(session[`${userType}Key`]);
    }
  });
  return users;
}

/**
 * Sends a request for the client to be a regular client for a trainer.
 * Request can be sent by either party. Requests are saved in the users table
 * for both the sender and recepient of the request.
 * @param {string} userKey firebase key associated with the user
 * @param {string} otherUserKey firebase key associated with the other user
 * @param {string} gymKey firebase key associated with the gym
 */
export async function sendRequest(userKey, otherUserKey, gymKey) {
  const user = await loadUser(userKey);
  await firebase.database().ref(`/users/${userKey}/sentRequests/${otherUserKey}`).set(true);
  await firebase.database().ref(`/users/${otherUserKey}/requests/${userKey}`).set({
    userKey,
    gymKey,
    name: user.name,
  });
}

/**
 * Denies a request that was sent by removing the request from both users'
 * object in users table.
 * @param {string} userKey firebase key associated with the user
 * @param {string} otherUserKey firebase key associated with the other user
 * @param {string} gymKey firebase key associated with the gym
 */
export async function denyRequest(userKey, otherUserKey, requestKey) {
  await firebase.database().ref(`/users/${otherUserKey}/sentRequests/${userKey}`).remove();
  await firebase.database().ref(`/users/${userKey}/requests/${requestKey}`).remove();
}

/**
 * Accepts a request by removing the request from the users' object in the users table.
 * Adds the trainer to the trainers portion in the client's user object in firebase.
 * Adds the client to the clients portion in the trainer's user object in firebase.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @param {Request} request the request object
 */
export async function acceptRequest(userKey, userType, request) {
  const user = await loadUser(userKey);
  await firebase.database().ref(`/users/${userKey}/requests/${request.key}`).remove();
  const userTable = userType === Constants.trainerType ? 'clients' : 'trainers';
  const otherUserTable = userType === Constants.trainerType ? 'trainers' : 'clients';
  await firebase.database().ref(`users/${userKey}/${userTable}/${request.userKey}`).set({
    name: request.name,
    userKey: request.userKey,
    gymKey: request.gymKey,
  });

  await firebase.database().ref(`users/${request.userKey}/${otherUserTable}/${userKey}`).set({
    name: user.name,
    userKey,
    gymKey: request.gymKey,
  });

  await firebase.database().ref(`/users/${request.userKey}/sentRequests/${userKey}`).remove();
}

/**
 * Retrieves all the past sessions where the specified user was involved.
 * @param {string} userKey firebase key associated with the user
 * @returns {Array[Session]} array of sessions where user was involved
 */
export async function loadSessions(userKey) {
  const sessions = [];
  await firebase.database().ref(`pastSessions/${userKey}`).once('value', (data) => {
    data.forEach((sessionValue) => {
      const { session } = sessionValue.val();
      session.key = sessionValue.key;
      sessions.push(session);
    });
  });
  return sessions;
}

/**
 * Retrieves all the gyms from the gyms table in firebase
 * @returns {Array[Gym]} array of all gyms in gyms table
 */
export async function loadGyms() {
  const userRegion = await getLocation();
  const gyms = [];
  await firebase.database().ref('gyms').once('value', (data) => {
    data.forEach((gymValue) => {
      const gym = gymValue.val();
      if (gym.virtual) {
        gym.location = userRegion;
      }
      gym.key = gymValue.key;
      gyms.push(gym);
    });
  });
  return gyms;
}

/**
 * Sorts all the gyms passed through based on their proximity to the location passsed in.
 * @param {Array[Gym]} gyms array of gyms to be sorted
 * @param {Location} userRegion location object of the user
 * @returns {Array[Gym]} sorted array of gyms
 */
export function sortGymsByLocation(gyms, region) {
  gyms.sort(
    (a, b) => geolib.getDistance(a.location, region) - geolib.getDistance(b.location, region),
  );
  return gyms;
}

/**
 * Retrieves any gyms that have a match with the query string from the gyms table.
 * @param {string} query string used in search
 * @returns {Array[Gym]} array of gyms where query string resulted in a match
 */
export async function searchGyms(query) {
  const gyms = [];
  await firebase.database().ref('gyms').orderByChild('name').startAt(query)
    .endAt(`${query}\uf8ff`)
    .once(('value'), (data) => {
      data.forEach((gymValue) => {
        const gym = gymValue.val();
        gym.key = gymValue.key;
        gyms.push(gym);
      });
    });
  return gyms;
}

/**
 * Adds an independent type trainer to an independent type gym.
 * Adds the gym to the gyms object of the user in the users table and adds the
 * trainer to the trainers object of the gym in the gyms table.
 * @param {string} userKey firebase key associated with the user
 * @param {string} gymKey firebase key associated with the gym
 */
export async function joinGym(userKey, gymKey) {
  const gym = await loadGym(gymKey);
  const user = await loadUser(userKey);
  await firebase.database().ref(`/users/${userKey}/gyms/${gymKey}`).set({
    type: gym.type,
    name: gym.name,
    joined: new Date().toString(),
  });
  await firebase.database().ref(`/gyms/${gymKey}/trainers/${userKey}`).set({
    active: user.active,
    bio: user.bio,
    cert: user.cert,
    name: user.name,
    rate: user.rate,
    rating: user.rating,
    offset: user.offset,
    joined: new Date().toString(),
  });
}

/**
 * Removes an independent type trainer from an independent type gym.
 * Removes the gym from the gyms object of the user in the users table
 * and removes the trainer from the trainers object of the gym in the gyms table.
 * @param {string} userKey firebase key associated with the user
 * @param {string} gymKey firebase key associated with the gym
 */
export async function leaveGym(userKey, gymKey) {
  await firebase.database().ref(`/users/${userKey}/gyms/${gymKey}`).remove();
  await firebase.database().ref(`/gyms/${gymKey}/trainers/${userKey}`).remove();
}

/**
 * Goes to the rating page if there is a session that has been
 * completed by the user but has not been rated.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 */
export async function goToPendingRating(userKey, userType) {
  const userSchedule = (await firebase.database().ref(`/users/${userKey}/schedule`).once('value')).val();
  const ratingField = `${userType}Rating`;
  if (userSchedule) {
    Object.keys(userSchedule).map(async (key) => {
      let session = null;
      if (userSchedule[key].type === Constants.groupSessionType) {
        session = (await firebase.database().ref(`/groupSessions/${key}`).once('value')).val();
        if (userType === Constants.trainerType) {
          if (session && session.end && !session[ratingField]) {
            Actions.GroupSessionRatingPage({ session: key });
          }
        } else if (session && session.end && !session.clients[userKey].rating) {
          Actions.GroupSessionRatingPage({ session: key });
        }
      } else {
        session = (await firebase.database().ref(`/trainSessions/${key}`).once('value')).val();
        if (session && session.end && !session[ratingField]) {
          Actions.RatingPage({ session: key });
        }
      }
    });
  }
}

/**
 * Retrieves any personal session that is in progress
 * that involves the specified user.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {Session} session that is in progress
 */
export async function loadCurrentSession(userKey, userType) {
  const ratingField = `${userType}Rating`;
  let currentSession = null;
  await firebase.database().ref('trainSessions').orderByChild(`${userType}Key`).equalTo(userKey)
    .once('value', (snapshot) => {
      snapshot.forEach((sessionValue) => {
        const session = sessionValue.val();
        if (new Date(session.start) < new Date() && !session[ratingField]) {
          currentSession = sessionValue.key;
        }
      });
    });
  return currentSession;
}

/**
 * Retrieves any group session that is in progress
 * that involves the specified user.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {GroupSession} group session that is in progress
 */
export async function loadCurrentGroupSession(userKey, userType) {
  let currentSession = null;
  const sessions = await loadGroupSessions(userKey, userType);
  sessions.forEach((session) => {
    if (new Date(session.start) < new Date()
      && ((session.clients && session.clients[userKey] && !session.clients[userKey].rating)
      || !session.trainerRating)) {
      currentSession = session.key;
    }
  });
  return currentSession;
}

/**
 * Checks if there are any sessions that have not been viewed by the specified user.
 * @param {string} userKey firebase key associated with the user
 * @param {string} userType the type of the user (client, trainer, manager)
 * @returns {boolean} whether there are any unread sessions or not
 */
export async function checkForUnreadSessions(userKey, userType) {
  let unread = false;
  await firebase.database().ref('pendingSessions').orderByChild(`${userType}Key`).equalTo(userKey)
    .once('value', (snapshot) => {
      snapshot.forEach((sessionValue) => {
        const session = sessionValue.val();
        if (!session.read && session.sentBy !== userType) {
          unread = true;
        }
      });
    });
  await firebase.database().ref('trainSessions').orderByChild(`${userType}Key`).equalTo(userKey)
    .once('value', (snapshot) => {
      snapshot.forEach((sessionValue) => {
        const session = sessionValue.val();
        if (!session.read && session.sentBy === userType) {
          unread = true;
        }
      });
    });
  return unread;
}

/**
 * Adds the session and additional info regarding the reporter and the reason
 * to the reportSessions table.
 * @param {Session} session session object that is being reported
 * @param {string} reporter firebase key associated with user that is reporting
 * @param {string} report reason session is being reported
 */
export async function reportSession(session, reporter, report) {
  await firebase.database().ref('reportSessions').child(`${session.key}/${reporter}`).set({
    sessionKey: session.key,
    trainerKey: session.trainerKey,
    clientKey: session.clientKey,
    reportedBy: reporter,
    reason: report,
  });
}

/**
 * Calls the firebase cloud function which calls the stripe API to retrieve any cards associated
 * with the stripe id.
 * @param {string} stripeId stripe token of user
 * @returns {Array[StripeResponseCards]} array of cards belonging to the user
 */
export async function loadTrainerCards(stripeId) {
  if (!stripeId) {
    return [];
  }
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/listTrainerCards/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message === 'Success' && response.body.cards) {
    return response.body.cards.data;
  }
  return [];
}

/**
 * Calls the firebase cloud function which calls the stripe API to retrieve the balance associated
 * with the stripe id.
 * @param {string} stripeId stripe token of user
 * @returns {number} balance of user
 */
export async function loadBalance(stripeId) {
  if (!stripeId) {
    return [];
  }
  const user = firebase.auth().currentUser;
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/getBalance/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      user: user.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message === 'Success' && response.body.balance) {
    return response.body.balance.available[0].amount + response.body.balance.pending[0].amount;
  }
  return 0;
}

/**
 * Calls the firebase cloud function which calls the stripe API to delete the card associated
 * with the stripe and card id.
 * @param {string} stripeId stripe token of user
 * @param {string} cardId stripe id of the card
 */
export async function deleteTrainerCard(stripeId, cardId) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/deleteTrainerCard/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      cardId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error.');
  }
}

/**
 * Calls the firebase cloud function which calls the stripe API to delete the card associated
 * with the stripe and card id. If it is the last card then cardAdded boolean is set to false
 * for the user's object in the users table.
 * @param {string} stripeId stripe token of user
 * @param {string} cardId stripe id of the card
 * @param {boolean} lastCard whether the card is the last card of the user
 */
export async function deleteCard(stripeId, cardId, lastCard) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/deleteCard/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      cardId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
  if (lastCard) {
    await firebase.database().ref(`/users/${firebase.auth().currentUser.uid}`).update({
      cardAdded: false,
    });
  }
}

/**
 * Retrieves the FontAwesome icon that is the brand of the card.
 * @param {string} brand brand name of card
 * @returns {FontAwesome} the fontawesome icon of the card brand if it exists
 */
export function getCardIcon(brand) {
  if (brand === 'Visa') {
    return (<FontAwesome name="cc-visa" size={20} />);
  }
  if (brand === 'American Express') {
    return (<FontAwesome name="cc-amex" size={20} />);
  }
  if (brand === 'MasterCard') {
    return (<FontAwesome name="cc-mastercard" size={20} />);
  }
  if (brand === 'Discover') {
    return (<FontAwesome name="cc-Discover" size={20} />);
  }
  if (brand === 'JCB') {
    return (<FontAwesome name="cc-jcb" size={20} />);
  }
  if (brand === 'Diners Club') {
    return (<FontAwesome name="cc-diners-club" size={20} />);
  }
  return (<FontAwesome name="credit-card" size={20} />);
}

/**
 * Calls the firebase cloud function which calls the stripe API to retrieve any cards associated
 * with the stripe id.
 * @param {string} stripeId stripe token of user
 * @returns {Array[StripeResponseCards]} array of cards belonging to the user
 */
export async function loadCards(stripeId) {
  if (!stripeId) {
    return [];
  }
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/listCards/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message === 'Success' && response.body.cards) {
    return response.body.cards.data;
  }
  return [];
}

/**
 * Calls the firebase cloud function which calls the stripe API to set the the card associated
 * with the card id as the default card for the stripe account.
 * @param {string} stripeId stripe token of user
 * @param {string} cardId stripe id of the card
 */
export async function setDefaultCard(stripeId, cardId) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/setDefaultCard/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      cardId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 * Calls the firebase cloud function which calls the stripe API to set the the card associated
 * with the card id as the default card for the stripe account.
 * @param {string} stripeId stripe token of user
 * @param {string} cardId stripe id of the card
 */
export async function setDefaultTrainerCard(stripeId, cardId) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/setDefaultTrainerCard/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      stripeId,
      cardId,
      user: firebase.auth().currentUser.uid,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 * Retrieves the session object with the specified session key from the trainSessions table.
 * @param {string} sessionKey firebase key associated with the session
 * @returns {Session} session object with specified key
 */
export async function loadSession(sessionKey) {
  const session = (await firebase.database().ref(`/trainSessions/${sessionKey}`).once('value')).val();
  session.key = sessionKey;
  return session;
}

/**
 * Rates the specified question and updates the session object in the trainSessions table.
 * If both the client and trainer have rated the session then the session is deleted from the
 * trainSessions table. The session is added to the pastSessions table under the user's sub table.
 * Also updates the other user's rating and session count in the users table
 * and the gyms table if the user is a trainer.
 * @param {string} sessionKey firebase key associated with the session
 * @param {number} rating rating to use for session
 * @param {string} userType the type of the user (client, trainer, manager)
 */
export async function rateSession(sessionKey, rating, userType) {
  const session = await loadSession(sessionKey);
  const userId = firebase.auth().currentUser.uid;
  const otherUserKey = userType === Constants.trainerType ? session.clientKey : session.trainerKey;
  const otherUser = await loadUser(otherUserKey);
  const ratingField = `${userType}Rating`;
  const totalRating = otherUser.rating * otherUser.sessions;
  const newRating = ((totalRating + rating) / (otherUser.sessions + 1)).toFixed(2);
  if (userType === Constants.clientType) {
    const trainer = await loadUser(session.trainerKey);
    Object.keys(trainer.gyms).forEach((gymKey) => {
      firebase.database().ref(`/gyms/${gymKey}/trainers/${session.trainerKey}`).update({
        rating: parseFloat(newRating),
      });
    });
  }
  await firebase.database().ref(`/users/${otherUserKey}`).update({
    rating: parseFloat(newRating),
    sessions: (otherUser.sessions + 1),
  });
  await firebase.database().ref(`/users/${userId}/schedule/${session.key}`).remove();
  session[ratingField] = rating;
  await firebase.database().ref(`/pastSessions/${userId}/${session.key}`).set({ session });

  await firebase.database().ref(`/trainSessions/${session.key}`).update({ [ratingField]: rating });

  if (
    (userType === Constants.trainerType && session.clientRating)
    || (userType === Constants.clientType && session.trainerRating)
  ) {
    firebase.database().ref(`/pastSessions/${session.clientKey}/${session.key}/session/`).update({
      [ratingField]: rating,
    });
    firebase.database().ref(`/trainSessions/${session.key}`).remove();
  }
}

/**
 * Rates the specified question and updates the session object in the groupSession table.
 * If both the client and trainer have rated the session then the session is deleted from the
 * groupSessions table. The session is added to the pastSessions table under the user's subtable.
 * Also updates the other user's rating and session count in the users table
 * and the gyms table if the user is a trainer.
 * @param {string} sessionKey firebase key associated with the session
 * @param {number} rating rating to use for session
 * @param {string} userType the type of the user (client, trainer, manager)
 */
export async function rateGroupSession(sessionKey, rating, userType) {
  const userId = firebase.auth().currentUser.uid;
  let session = await loadGroupSession(sessionKey);
  if (userType === Constants.clientType) {
    const trainer = await loadUser(session.trainerKey);
    const totalRating = trainer.rating * trainer.sessions;
    const newRating = ((totalRating + rating) / (trainer.sessions + 1)).toFixed(2);
    Object.keys(trainer.gyms).forEach((gymKey) => {
      firebase.database().ref(`/gyms/${gymKey}/trainers/${session.trainerKey}`).update({
        rating: parseFloat(newRating),
      });
    });
    await firebase.database().ref(`/users/${session.trainerKey}`).update({
      rating: parseFloat(newRating),
      sessions: (trainer.sessions + 1),
    });
    await firebase.database().ref(`/users/${userId}/schedule/${sessionKey}`).remove();
    await firebase.database().ref(`/groupSessions/${sessionKey}/clients/${userId}`).update({ rating });
  } else {
    await firebase.database().ref(`/groupSessions/${sessionKey}`).update({ trainerRating: rating });
    await firebase.database().ref(`/users/${userId}/schedule/${sessionKey}`).remove();
  }
  session = await loadGroupSession(sessionKey);
  await firebase.database().ref(`/pastSessions/${userId}/${sessionKey}`).set({ session });
  let allRatingsCompleted = true;
  if (session.clients) {
    Object.keys(session.clients).forEach((key) => {
      const client = session.clients[key];
      if (!client.rating) {
        allRatingsCompleted = false;
      }
    });
  }
  if (allRatingsCompleted && session.trainerRating) {
    firebase.database().ref(`/groupSessions/${sessionKey}`).remove();
    firebase.database().ref(`/gyms/${session.gymKey}/groupSessions/${sessionKey}`).remove();
  }
}

/**
 * Marks all unread pending and accepted sessions as read in the appropriate table.
 * @param {Array[Session]} pendingSessions array of the user's pending sessions
 * @param {Array[Session]} acceptedSessions array of the user's accepted sessions
 * @param {string} userType the type of the user (client, trainer, manager)
 */
export async function markSessionsAsRead(pendingSessions, acceptedSessions, userType) {
  pendingSessions.map(async (session) => {
    if ((userType === Constants.trainerType && session.sentBy === Constants.clientType)
      || (userType === Constants.clientType && session.sentBy === Constants.trainerType)) {
      await firebase.database().ref(`/pendingSessions/${session.key}`).update({ read: true });
    }
  });
  acceptedSessions.map(async (session) => {
    if ((userType === Constants.trainerType && session.sentBy !== Constants.clientType)
      || (userType === Constants.clientType && session.sentBy !== Constants.trainerType)) {
      await firebase.database().ref(`/trainSessions/${session.key}`).update({ read: true });
    }
  });
}

/**
 * Calls the firebase cloud function that charges the client's card and gives the amount minus our
 * cut to the trainer's balance. Then a text will be sent to the user indicating
 * them of the charge.
 * @param {string} clientStripe stripe token of client
 * @param {stripe} trainerStripe stripe token of trainer
 * @param {number} amount amount to charge client
 * @param {number} cut amount of cost to take from trainer
 * @param {Session} session session object associated with charge
 * @param {string} userPhone string of user's (client) phone number
 */
export async function chargeCard(clientStripe, trainerStripe, amount, cut) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/charge/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      amount,
      cut,
      clientStripe,
      trainerStripe,
      currency: 'USD',
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 * Creates a subscription using Stripe.
 * @param {string} productId id of stripe product associated with plan
 * @param {string} clientStripe stripe id of user subscribing
 * @param {string} trainerStripe stripe id of trainer who created plan
 * @param {number} amount price for subscription
 * @param {number} percentage percentage trainnow takes of subscription
 * @param {string} interval how often the user is charged (monthly, daily, etc.)
 */
export async function createSubscription(
  productId,
  clientStripe,
  trainerStripe,
  amount,
  percentage,
  interval,
) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/createSubscription/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      productId,
      clientStripe,
      trainerStripe,
      amount,
      percentage,
      interval,
      currency: 'USD',
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
  return response;
}

/**
 * Cancels a subscription.
 * @param {string} subscriptionId subscription id of subscription to cancel
 */
export async function cancelSubscription(subscriptionId) {
  const res = await fetch(`${FB_URL}/stripe/cancelSubscription/`, {
    method: 'POST',
    body: JSON.stringify({
      subscriptionId,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 *
 * @param {string} stripeId Stripe id associated with user
 * @param {string} productId Stripe id to be used for product
 * @param {*} productName name of product
 */
export async function createProduct(stripeId, productId, productName) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/createProduct/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      productId,
      stripeId,
      productName,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 *
 * @param {string} productKey id of Stripe product to delete
 */
export async function deleteProduct(productId) {
  const res = await fetch(`${FB_URL}/stripe/deleteProduct/`, {
    method: 'POST',
    body: JSON.stringify({
      productId,
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
}

/**
 * Creates a session in the groupSessions table and the gyms table for the specified gym.
 * Also adds the schedule to the user's object in the users table.
 * @param {User} trainer user object of the trainer
 * @param {string} start datetime string of session start time
 * @param {string} duration duration in minutes of the session
 * @param {string} name name of the session
 * @param {string} bio bio of the session
 * @param {string} capacity session capacity
 * @param {string} cost cost of the session
 * @param {string} gymKey firebase key associated with the gym session is hosted at
 */
export async function createGroupSession(
  trainer,
  start,
  duration,
  name,
  bio,
  capacity,
  cost,
  gymKey,
) {
  const gym = await loadGym(gymKey);
  const session = {
    gymKey,
    gymName: gym.name,
    location: gym.location ? gym.location : null,
    trainerKey: trainer.userKey,
    trainerName: trainer.name,
    trainerStripe: trainer.stripeId,
    trainerPhone: trainer.phone,
    trainerType: trainer.trainerType,
    cost: parseInt(cost, 10),
    start: start.toString(),
    duration,
    name,
    bio,
    clientCount: 0,
    capacity,
    type: Constants.groupSessionType,
    virtual: gym.virtual ? gym.virtual : false,
  };
  const sessionKey = firebase.database().ref('groupSessions').push(session).key;
  await firebase.database().ref(`gyms/${gymKey}/groupSessions/${sessionKey}`).set(session);
  const userId = firebase.auth().currentUser.uid;
  const end = new Date(new Date(start).getTime() + (60000 * duration));
  await firebase.database().ref(`users/${userId}/schedule/${sessionKey}`).set({
    start: start.toString(),
    end: end.toString(),
    type: Constants.groupSessionType,
  });
}

/**
 * Updates the group session in the groupSessions table and the gyms table for the specified gym.
 * Also updates the schedule to the user's object in the users table.
 * @param {User} trainer user object of the trainer
 * @param {GroupSession} session the existing session
 * @param {string} start datetime string of session start time
 * @param {string} duration duration in minutes of the session
 * @param {string} name name of the session
 * @param {string} bio bio of the session
 * @param {string} capacity session capacity
 * @param {string} cost cost of the session
 * @param {string} gymKey firebase key associated with the gym session is hosted at
 */
export async function updateGroupSession(
  trainer,
  session,
  start,
  duration,
  name,
  bio,
  capacity,
  cost,
  gymKey,
) {
  const gym = await loadGym(gymKey);
  const updatedSession = {
    gymKey,
    gymName: gym.name,
    location: gym.location,
    trainerKey: trainer.userKey,
    trainerName: trainer.name,
    trainerStripe: trainer.stripeId,
    trainerPhone: trainer.phone,
    cost: parseInt(cost, 10),
    start: start.toString(),
    duration,
    name,
    bio,
    capacity,
    type: Constants.groupSessionType,
    virtual: gym.virtual ? gym.virtual : false,
  };
  await firebase.database().ref(`groupSessions/${session.key}`).update(updatedSession);
  await firebase.database().ref(`gyms/${gymKey}/groupSessions/${session.key}`).update(updatedSession);
  const end = new Date(new Date(start).getTime() + (60000 * duration));
  const userId = firebase.auth().currentUser.uid;
  await firebase.database().ref(`users/${userId}/schedule/${session.key}`).set({
    start: start.toString(),
    end: end.toString(),
  });
}

/**
 * Allows a user to join the specified session by updating the groupSessions table and the session
 * in the gyms table. Also adds the session to the user's schedule.
 * @param {GroupSession} session session object of the group session
 * @param {User} user user object of the user
 * @param {string} userKey firebase key associated with the user
 */
export async function joinGroupSession(session, user, userKey) {
  const clientInfo = {
    clientKey: userKey,
    name: user.name,
    stripeId: user.stripeId,
    phone: user.phone,
  };
  const currentClientCount = (await firebase.database().ref(`groupSessions/${session.key}/clientCount`).once('value')).val();
  await firebase.database().ref(`groupSessions/${session.key}/clients/${userKey}`).set(clientInfo);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clients/${userKey}`).set(clientInfo);
  await firebase.database().ref(`groupSessions/${session.key}/clientCount`).set(currentClientCount + 1);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clientCount`).set(currentClientCount + 1);
  const end = new Date(new Date(session.start).getTime() + (60000 * session.duration));
  await firebase.database().ref(`users/${userKey}/schedule/${session.key}`).set({
    start: session.start.toString(),
    end: end.toString(),
    type: Constants.groupSessionType,
  });
}

/**
 * Shows an alert if the user is logging in for the first time.
 * @param {string} userKey firebase key associated with user
 */
export async function showFirstTimeMessage(userKey) {
  const user = await loadUser(userKey);
  if (user.type === Constants.trainerType && user.firstTimeLoggedIn) {
    Alert.alert('Be sure to tell any other trainers about TrainNow so we can start adding clients as soon as possible.');
    await firebase.database().ref(`/users/${userKey}/`).update({
      firstTimeLoggedIn: false,
    });
  }
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {string} planName workout plan's name
 * @param {string} planDescription workout plan's description
 * @param {string} planDuration workout plan's length
 * @param {Boolean} monthly whether the plan is subscription based (monthly charge)
 * @param {number} cost cost of the plan
 * @param {number} exercises number of exercises in the plan
 */
export async function createWorkoutPlan(
  userKey,
  name,
  description,
  duration,
  monthly,
  cost,
  exercises,
) {
  let planKey;
  try {
    const user = await loadUser(userKey);
    planKey = await firebase.database().ref(`/users/${userKey}/workoutPlans/`).push({
      name,
      description,
      duration,
      monthly,
      cost,
      exercises,
    }).key;

    if (monthly) {
      await createProduct(user.stripeId, planKey, `${user.name}'s ${name}`);
    }
  } catch (error) {
    if (planKey) {
      await firebase.database().ref(`/users/${userKey}/workoutPlans/${planKey}`).remove();
    }
  }
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {string} planKey firebase key associated with workout plan
 * @param {string} planName workout plan's name
 * @param {string} planDescription workout plan's description
 * @param {string} planDuration workout plan's length
 * @param {Boolean} monthly whether the plan is subscription based (monthly charge)
 * @param {number} cost cost of the plan
 * @param {number} exercises number of exercises in the plan
 */
export async function updateWorkoutPlan(
  userKey,
  planKey,
  name,
  description,
  duration,
  monthly,
  cost,
  exercises,
) {
  await firebase.database().ref(`/users/${userKey}/workoutPlans/${planKey}/`).update({
    name,
    description,
    duration,
    monthly,
    cost,
    exercises,
  });
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {string} name nutrition plan's name
 * @param {string} description nutrition plan's description
 * @param {string} duratino workout plan's length
 * @param {Boolean} monthly whether the plan is subscription based (monthly charge)
 * @param {number} cost cost of the plan
 * @param {number} meals number of unique meals
 */
export async function createNutritionPlan(
  userKey,
  name,
  description,
  duration,
  monthly,
  cost,
  meals,
) {
  let planKey;
  try {
    const user = await loadUser(userKey);
    planKey = await firebase.database().ref(`/users/${userKey}/nutritionPlans/`).push({
      name,
      description,
      duration,
      monthly,
      cost,
      meals,
    }).key;

    if (monthly) {
      await createProduct(user.stripeId, planKey, `${user.name}'s ${name}`);
    }
  } catch (error) {
    if (planKey) {
      await firebase.database().ref(`/users/${userKey}/nutritionPlans/${planKey}`).remove();
    }
  }
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {string} planKey firebase key associated with nutrition plan
 * @param {string} name nutrition plan's name
 * @param {string} description nutrition plan's description
 * @param {string} duration nutrition plan's length
 * @param {Boolean} monthly whether the plan is subscription based (monthly charge)
 * @param {number} cost cost of the plan
 * @param {number} meals number of unique meals
 */
export async function updateNutritionPlan(
  userKey,
  planKey,
  name,
  description,
  duration,
  monthly,
  cost,
  meals,
) {
  await firebase.database().ref(`/users/${userKey}/nutritionPlans/${planKey}/`).update({
    name,
    description,
    duration,
    monthly,
    cost,
    meals,
  });
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {Plan} plan plan object to be deleted
 * @param {string} planType specifies whether it is a workout or nutrition plan
 */
export async function deletePlan(userKey, plan, planType) {
  const tableName = planType === 'nutrition' ? 'nutritionPlans' : 'workoutPlans';
  if (plan.monthly) {
    if (plan.clients) {
      Object.keys(plan.clients).forEach(async (clientKey) => {
        const client = plan.clients[clientKey];
        await firebase.database().ref(`/users/${clientKey}/${tableName}/${plan.key}`).remove();
        await cancelSubscription(client.subscriptionId);
      });
    }
    await deleteProduct(plan.key);
  }
  await firebase.database().ref(`/users/${userKey}/${tableName}/${plan.key}`).remove();
}

/**
 *
 * @param {string} userKey firebase key associated with user
 * @param {Plan} plan plan object to be deleted
 * @param {string} planType specifies whether it is a workout or nutrition plan
 */
export async function cancelPlan(userKey, plan, planType) {
  const user = await loadUser(userKey);
  const tableName = planType === 'nutrition' ? 'nutritionPlans' : 'workoutPlans';
  if (plan.monthly) {
    await cancelSubscription(plan.subscriptionId);
    sendMessage(plan.trainerPhone, `${user.name} has cancelled their subscription to your ${plan.nam} plan.'`);
  }
  await firebase.database().ref(`/users/${userKey}/${tableName}/${plan.key}`).remove();
  await firebase.database().ref(`/users/${plan.trainerKey}/${tableName}/${plan.key}/clients/${userKey}`).remove();
}
