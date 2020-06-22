import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import geolib from 'geolib';
import { Actions } from 'react-native-router-flux';
import { FB_URL } from 'react-native-dotenv';
import Constants from './Constants';

// Convert date to yyyy-mm-dd format for Agenda events
export function dateforAgenda(date) {
  let month = `${date.getMonth() + 1}`;
  let day = `${date.getDate()}`;
  const year = date.getFullYear();

  if (month.length < 2) month = `0${month}`;
  if (day.length < 2) day = `0${day}`;

  return [year, month, day].join('-');
}

// Convert date to readable format
export function dateToString(start) {
  const pendingDate = new Date(start);
  const month = pendingDate.getMonth() + 1;
  const day = pendingDate.getDate();
  let hour = pendingDate.getHours();
  let minute = pendingDate.getMinutes();
  let abbr;

  if (minute < 10) {
    minute = `0${minute}`;
  }
  // Sets abbr to AM or PM
  if (hour > 12) {
    hour -= 12;
    abbr = ' PM';
  } else {
    if (hour === 0) {
      hour = 12;
    }
    abbr = ' AM';
  }

  const displayDate = `${month}/${day} ${hour}:${minute}${abbr}`;
  return displayDate;
}

// Convert date to readable time format
export function timeToString(start) {
  const pendingDate = new Date(start);
  let hour = pendingDate.getHours();
  let minute = pendingDate.getMinutes();
  let abbr;

  if (minute < 10) {
    minute = `0${minute}`;
  }
  // Sets abbr to AM or PM
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

// Checks if two date/time ranges overlap
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

// Loads user from user table in firebase
export async function loadUser(userKey) {
  let returnValue;
  await firebase.database().ref(`/users/${userKey}`).once('value', (snapshot) => {
    const user = snapshot.val();
    user.key = snapshot.key;
    returnValue = user;
  });
  return returnValue;
}

// Loads user except for sensitive data
export async function loadClient(userKey) {
  const cardAdded = await firebase.database().ref(`/users/${userKey}/cardAdded`).once('value');
  const name = await firebase.database().ref(`/users/${userKey}/name`).once('value');
  const phone = await firebase.database().ref(`/users/${userKey}/phone`).once('value');
  const rating = await firebase.database().ref(`/users/${userKey}/rating`).once('value');
  const sessions = await firebase.database().ref(`/users/${userKey}/sessions`).once('value');
  const type = await firebase.database().ref(`/users/${userKey}/type`).once('value');
  return {
    key: userKey,
    cardAdded: cardAdded.val(),
    name: name.val(),
    phone: phone.val(),
    rating: rating.val(),
    sessions: sessions.val(),
    type: type.val(),
  };
}

// Loads trainer except for sensitive data
export async function loadTrainer(userKey) {
  const active = await firebase.database().ref(`/users/${userKey}/active`).once('value');
  const bio = await firebase.database().ref(`/users/${userKey}/bio`).once('value');
  const cardAdded = await firebase.database().ref(`/users/${userKey}/cardAdded`).once('value');
  const cert = await firebase.database().ref(`/users/${userKey}/cert`).once('value');
  const clients = await firebase.database().ref(`/users/${userKey}/clients`).once('value');
  const gym = await firebase.database().ref(`/users/${userKey}/gym`).once('value');
  const name = await firebase.database().ref(`/users/${userKey}/name`).once('value');
  const pending = await firebase.database().ref(`/users/${userKey}/pending`).once('value');
  const phone = await firebase.database().ref(`/users/${userKey}/phone`).once('value');
  const rate = await firebase.database().ref(`/users/${userKey}/rate`).once('value');
  const rating = await firebase.database().ref(`/users/${userKey}/rating`).once('value');
  const sessions = await firebase.database().ref(`/users/${userKey}/sessions`).once('value');
  const type = await firebase.database().ref(`/users/${userKey}/type`).once('value');
  const trainerType = await firebase.database().ref(`/users/${userKey}/trainerType`).once('value');
  const offset = await firebase.database().ref(`/users/${userKey}/offset`).once('value');
  return {
    key: userKey,
    active: active.val(),
    bio: bio.val(),
    cardAdded: cardAdded.val(),
    cert: cert.val(),
    clients: clients.val(),
    gym: gym.val(),
    name: name.val(),
    pending: pending.val(),
    phone: phone.val(),
    rate: rate.val(),
    rating: rating.val(),
    sessions: sessions.val(),
    type: type.val(),
    trainerType: trainerType.val(),
    offset: offset.val() || 0,
  };
}

// Loads accepted schedule from users table
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

// Loads availability schedule from users table
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

export async function addAvailableSession(trainerKey, startDate, endDate) {
  firebase.database().ref(`users/${trainerKey}/availableSchedule/`).push({
    start: startDate.toString(),
    end: endDate.toString(),
  });
}

// Loads pending schedule from users table
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

// Loads complete session object of all pending sessions
export async function loadPendingSessions(userKey, userType) {
  const sessions = [];
  const pendingRef = firebase.database().ref('pendingSessions');
  await pendingRef.orderByChild(userType).equalTo(userKey).once('value', (data) => {
    data.forEach((snapshot) => {
      const pendingSession = snapshot.val();
      pendingSession.key = snapshot.key;
      sessions.push(pendingSession);
    });
  });
  return sessions;
}

// Loads complete session object of all accepted sessions
export async function loadUpcomingSessions(userKey, userType) {
  const sessions = [];
  const sessionDatabase = firebase.database().ref('trainSessions');
  await sessionDatabase.orderByChild(userType).equalTo(userKey).once('value', (data) => {
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

// Loads a group session using the session key
export async function loadGroupSession(sessionKey) {
  const session = (await firebase.database().ref(`groupSessions/${sessionKey}`).once('value')).val();
  session.key = sessionKey;
  return session;
}

// Loads complete session object of all group sessions
export async function loadGroupSessions(userKey, userType) {
  const sessions = [];
  const groupSessionDatabase = firebase.database().ref('groupSessions');
  if (userType === Constants.trainerType) {
    await groupSessionDatabase.orderByChild('trainer').equalTo(userKey).once('value', (data) => {
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
    const userSchedule = (await firebase.database().ref(`/users/${userKey}/schedule`).once('value')).val();
    if (userSchedule) {
      Object.keys(userSchedule).map(async (key) => {
        const session = (await firebase.database().ref(`/groupSessions/${key}`).once('value')).val();
        if (session && !session.end) {
          session.key = key;
          sessions.push(session);
        }
      });
    }
  }
  return sessions;
}

// Creates session in accepted sessions table in database and removes pending sessions
export async function createSession(session, sessionKey, startTime, endTime) {
  const userId = firebase.auth().currentUser.uid;
  const userStripeField = (session.sentBy === 'trainer') ? 'clientStripe' : 'trainerStripe';
  const otherUserStripeField = (session.sentBy === 'trainer') ? 'trainerStripe' : 'clientStripe';
  const otherUserStripe = (session.sentBy === 'trainer') ? session.trainerStripe : session.clientStripe;
  const user = await loadUser(userId);
  // create session object in accepted sessions table
  firebase.database().ref('trainSessions').child(sessionKey).set({
    client: session.client,
    trainer: session.trainer,
    clientName: session.clientName,
    trainerName: session.trainerName,
    start: session.start,
    duration: session.duration,
    location: session.location,
    rate: session.rate,
    gym: session.gym,
    gymKey: session.gymKey,
    sentBy: session.sentBy,
    regular: session.regular,
    [userStripeField]: user.stripeId,
    [otherUserStripeField]: otherUserStripe,
    clientPhone: session.clientPhone,
    trainerPhone: session.trainerPhone,
    started: false,
    read: false,
    trainerType: session.trainerType,
    type: session.type,
  });

  const otherUserKey = (userId === session.client) ? session.trainer : session.client;

  // remove session from pending sessions table and from pending schedule of user who initiated it
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  firebase.database().ref(`/users/${otherUserKey}/pendingschedule/`).child(sessionKey).remove();

  // add session to trainer's and client's schedule
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

// Allows trainer or client to cancel a pending (non accepted) session
export async function cancelPendingSession(session, sessionKey) {
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  const userSentBy = (session.sentBy === 'client') ? session.client : session.trainer;
  firebase.database().ref(`/users/${userSentBy}/pendingschedule/`).child(sessionKey).remove();
}

// Allows trainer or client to cancel a session before it starts
export async function cancelUpcomingSession(session) {
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref('cancelSessions').child(userId).push(session);
  firebase.database().ref('trainSessions').child(session.key).remove();
  firebase.database().ref(`/users/${session.client}/schedule/`).child(session.key).remove();
  firebase.database().ref(`/users/${session.trainer}/schedule/`).child(session.key).remove();
}

// Allows a trainer to cancel a group session that has not been started
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

// Allows a client to leave a group session that has not yet started
export async function leaveGroupSession(session) {
  const userId = firebase.auth().currentUser.uid;
  const currentClientCount = (await firebase.database().ref(`groupSessions/${session.key}/clientCount`).once('value')).val();
  firebase.database().ref(`/groupSessions/${session.key}/clients/${userId}`).remove();
  firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clients/${userId}`).remove();
  await firebase.database().ref(`groupSessions/${session.key}/clientCount`).set(currentClientCount - 1);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clientCount`).set(currentClientCount - 1);
  firebase.database().ref(`/users/${userId}/schedule/`).child(session.key).remove();
}

// Sends text message using twilio
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

export async function loadGym(gymKey) {
  let gym;
  await firebase.database().ref('gyms').child(gymKey).once('value', (snapshot) => {
    gym = snapshot.val();
    gym.key = gymKey;
  });
  return gym;
}

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
  const userStripeField = (sentBy === 'client') ? 'clientStripe' : 'trainerStripe';
  const userStripe = (sentBy === 'client') ? client.stripeId : trainer.stripeId;
  const sessionKey = firebase.database().ref('pendingSessions').push({
    client: client.key,
    clientName: client.name,
    trainer: trainer.key,
    trainerName: trainer.name,
    start: date.toString(),
    duration,
    location: gym.location,
    gym: gym.name,
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
  }).key;
  const end = new Date(new Date(date).getTime() + (60000 * duration));
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref(`users/${userId}/pendingschedule/`).child(sessionKey).set({
    start: date.toString(),
    end: end.toString(),
    type: Constants.personalSessionType,
  });
}

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

export async function loadRecentTrainers(clientKey) {
  const trainers = [];
  const trainerMap = [];
  await firebase.database().ref(`pastSessions/${clientKey}`).once('value', (data) => {
    data.forEach((sessionValue) => {
      const { session } = sessionValue.val();
      if (!trainerMap.includes(session.trainer)) {
        trainers.push({
          name: session.trainerName,
          key: session.trainer,
          date: session.start,
          gym: session.gym,
        });
        trainerMap.push(session.trainer);
      }
    });
  });
  return trainers;
}

export async function loadRecentClients(trainerKey) {
  const clients = [];
  const clientMap = [];
  await firebase.database().ref(`pastSessions/${trainerKey}`).once('value', (data) => {
    data.forEach((sessionValue) => {
      const { session } = sessionValue.val();
      if (session.client && !clientMap.includes(session.client)) {
        clients.push({
          name: session.clientName,
          key: session.client,
          date: session.start,
          gym: session.gym,
        });
        clientMap.push(session.client);
      }
    });
  });
  return clients;
}

export async function loadClientRequests(clientKey) {
  const requests = [];
  const clientRequests = await firebase.database().ref('clientRequests').child(clientKey).once('value');
  clientRequests.forEach((sessionValue) => {
    const session = sessionValue.val();
    session.key = sessionValue.key;
    requests.push(session);
  });
  return requests;
}

export async function loadTrainerRequests(trainerKey) {
  const requests = [];
  const trainerRequests = await firebase.database().ref('trainerRequests').child(trainerKey).once('value');
  trainerRequests.forEach((sessionValue) => {
    const session = sessionValue.val();
    session.key = sessionValue.key;
    requests.push(session);
  });
  return requests;
}

export async function denyClientRequest(requestKey, clientKey, trainerKey) {
  await firebase.database().ref('clientRequests').child(clientKey).child(requestKey)
    .remove();
  await firebase.database().ref('users').child(trainerKey).child('requests')
    .child(clientKey)
    .remove();
}

export async function denyTrainerRequest(requestKey, clientKey, trainerKey) {
  await firebase.database().ref('trainerRequests').child(trainerKey).child(requestKey)
    .remove();
  await firebase.database().ref('users').child(clientKey).child('requests')
    .child(trainerKey)
    .remove();
}

export async function acceptTrainerRequest(
  requestKey,
  trainerKey,
  trainerName,
  clientKey,
  clientName,
  gymKey,
) {
  await firebase.database().ref('trainerRequests').child(trainerKey).child(requestKey)
    .remove();
  await firebase.database().ref('users').child(clientKey).child('requests')
    .child(trainerKey)
    .remove();

  await firebase.database().ref(`users/${trainerKey}/clients/${clientKey}`).set({
    client: clientKey,
    clientName,
  });

  await firebase.database().ref(`users/${clientKey}/trainers/${trainerKey}`).set({
    trainerName,
    trainer: trainerKey,
    gym: gymKey,
  });
}

export async function acceptClientRequest(
  requestKey,
  trainerKey,
  trainerName,
  clientKey,
  clientName,
  gymKey,
) {
  await firebase.database().ref('clientRequests').child(clientKey).child(requestKey)
    .remove();
  await firebase.database().ref('users').child(trainerKey).child('requests')
    .child(clientKey)
    .remove();

  await firebase.database().ref(`users/${trainerKey}/clients/${clientKey}`).set({
    client: clientKey,
    clientName,
  });

  await firebase.database().ref(`users/${clientKey}/trainers/${trainerKey}`).set({
    trainerName,
    trainer: trainerKey,
    gym: gymKey,
  });
}

export async function sendTrainerRequest(trainerKey, clientName, clientKey, gymKey) {
  await firebase.database().ref('trainerRequests').child(trainerKey).push({
    status: 'pending',
    client: clientKey,
    clientName,
    gym: gymKey,
  });
  await firebase.database().ref(`users/${clientKey}/requests/${trainerKey}`).set(true);
}

export async function sendClientRequest(clientKey, trainerKey, trainerName, gymKey) {
  await firebase.database().ref('clientRequests').child(clientKey).push({
    status: 'pending',
    trainer: trainerKey,
    trainerName,
    gym: gymKey,
  });
  await firebase.database().ref(`users/${trainerKey}/requests/${clientKey}`).set(true);
}

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

export async function getLocation() {
  let location;
  if (Platform.OS === 'ios') {
    location = await Location.getCurrentPositionAsync();
  } else {
    location = await Location.getCurrentPositionAsync({ enableHighAccuracy: true });
  }
  return {
    latitude: Number(JSON.stringify(location.coords.latitude)),
    longitude: Number(JSON.stringify(location.coords.longitude)),
    latitudeDelta: 0.0422,
    longitudeDelta: 0.0221,
  };
}

export async function loadGyms() {
  const gyms = [];
  await firebase.database().ref('gyms').once('value', (data) => {
    data.forEach((gymValue) => {
      const gym = gymValue.val();
      gym.key = gymValue.key;
      gyms.push(gym);
    });
  });
  return gyms;
}

export async function goToPendingRating(userType, userKey) {
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

export async function loadCurrentSession(userType, userKey) {
  const ratingField = `${userType}Rating`;
  let currentSession = null;
  await firebase.database().ref('trainSessions').orderByChild(userType).equalTo(userKey)
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

export async function loadCurrentGroupSession(userType, userKey) {
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

export async function checkForUnreadSessions(userType, userKey) {
  let unread = false;
  await firebase.database().ref('pendingSessions').orderByChild(userType).equalTo(userKey)
    .once('value', (snapshot) => {
      snapshot.forEach((sessionValue) => {
        const session = sessionValue.val();
        if (!session.read && session.sentBy !== userType) {
          unread = true;
        }
      });
    });
  await firebase.database().ref('trainSessions').orderByChild(userType).equalTo(userKey)
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

export async function reportSession(session, reporter, report) {
  await firebase.database().ref('reportSessions').child(`${session.key}/${reporter}`).set({
    sessionKey: session.key,
    trainer: session.trainer,
    client: session.client,
    reportedBy: reporter,
    reason: report,
  });
}

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

export async function loadSession(sessionKey) {
  let sessionToReturn;
  await firebase.database().ref('trainSessions').orderByKey().equalTo(sessionKey)
    .once('value', (snapshot) => {
      snapshot.forEach((sessionValue) => {
        const session = sessionValue.val();
        session.key = sessionValue.key;
        sessionToReturn = session;
      });
    });
  return sessionToReturn;
}

export async function rateSession(sessionKey, rating, userType) {
  const session = await loadSession(sessionKey);
  const userId = firebase.auth().currentUser.uid;
  const otherUserKey = userType === Constants.trainerType ? session.client : session.trainer;
  const otherUser = await loadClient(otherUserKey);
  const ratingField = `${userType}Rating`;
  const totalRating = otherUser.rating * otherUser.sessions;
  const newRating = ((totalRating + rating) / (otherUser.sessions + 1)).toFixed(2);
  if (userType === Constants.clientType) {
    firebase.database().ref(`/gyms/${session.gymKey}/trainers/${session.trainer}`).update({
      rating: parseFloat(newRating),
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
    firebase.database().ref(`/pastSessions/${session.client}/${session.key}/session/`).update({
      [ratingField]: rating,
    });
    firebase.database().ref(`/trainSessions/${session.key}`).remove();
  }
}

export async function rateGroupSession(sessionKey, rating, userType) {
  const userId = firebase.auth().currentUser.uid;
  let session = await loadGroupSession(sessionKey);
  if (userType === Constants.clientType) {
    const trainer = await loadClient(session.trainer);
    const totalRating = trainer.rating * trainer.sessions;
    const newRating = ((totalRating + rating) / (trainer.sessions + 1)).toFixed(2);
    firebase.database().ref(`/gyms/${session.gymKey}/trainers/${session.trainer}`).update({
      rating: parseFloat(newRating),
    });
    await firebase.database().ref(`/users/${session.trainer}`).update({
      rating: parseFloat(newRating),
      sessions: (trainer.sessions + 1),
    });
    await firebase.database().ref(`/users/${userId}/schedule/${sessionKey}`).remove();
    await firebase.database().ref(`/groupSessions/${sessionKey}/clients/${userId}`).update({ rating });
  } else {
    await firebase.database().ref(`/groupSessions/${sessionKey}`).update({ trainerRating: rating });
  }
  session = await loadGroupSession(sessionKey);
  await firebase.database().ref(`/pastSessions/${userId}/${sessionKey}`).set({ session });
  let allRatingsCompleted = true;
  Object.keys(session.clients).forEach((key) => {
    const client = session.clients[key];
    if (!client.rating) {
      allRatingsCompleted = false;
    }
  });
  if (allRatingsCompleted && session.trainerRating) {
    firebase.database().ref(`/groupSessions/${sessionKey}`).remove();
    firebase.database().ref(`/gyms/${session.gymKey}/groupSessions/${sessionKey}`).remove();
  }
}

export async function markSessionsAsRead(pendingSessions, acceptSessions, userType) {
  // marks sessions as read in database to prevent new session alert message from appearing twice
  pendingSessions.map(async (session) => {
    if ((userType === Constants.trainerType && session.sentBy === Constants.clientType)
      || (userType === Constants.clientType && session.sentBy === Constants.trainerType)) {
      await firebase.database().ref(`/pendingSessions/${session.key}`).update({ read: true });
    }
  });
  acceptSessions.map(async (session) => {
    if ((userType === Constants.trainerType && session.sentBy !== Constants.clientType)
      || (userType === Constants.clientType && session.sentBy !== Constants.trainerType)) {
      await firebase.database().ref(`/trainSessions/${session.key}`).update({ read: true });
    }
  });
}

export async function chargeCard(clientStripe, trainerStripe, amount, cut, session) {
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/stripe/charge/`, {
    method: 'POST',
    headers: {
      Authorization: idToken,
    },
    body: JSON.stringify({
      charge: {
        amount,
        cut,
        clientStripe,
        trainerStripe,
        currency: 'USD',
      },
    }),
  });
  const response = await res.json();
  if (response.body.message !== 'Success') {
    throw new Error('Stripe Error');
  }
  const message = `You were charged $ ${(amount / 100).toFixed(2)} for your session with ${session.trainerName}. If this is not accurate please contact support.`;
  sendMessage(session.clientPhone, message);
}

export async function startSession(sessionKey, userRegion) {
  const session = await loadSession(sessionKey);
  if (geolib.getDistance(userRegion, session.location) > 300) {
    Alert.alert('You must be within 1000 feet to press ready!');
    return;
  }

  const user = firebase.auth().currentUser;
  const sessionDatabase = firebase.database().ref(`/trainSessions/${session.key}`);
  if (session.trainer === user.uid) {
    // If both are ready set metup true and start time
    if (session.clientReady) {
      sessionDatabase.update({ trainerReady: true, started: true, start: new Date() });
    } else {
      sessionDatabase.update({ trainerReady: true });
    }
  // If both are ready set metup true and start time
  } else if (session.trainerReady) {
    sessionDatabase.update({ clientReady: true, started: true, start: new Date() });
  } else {
    sessionDatabase.update({ clientReady: true });
  }
}

export async function startGroupSession(sessionKey, userRegion) {
  const session = await loadGroupSession(sessionKey);
  const sessionDatabase = firebase.database().ref(`/groupSessions/${sessionKey}`);
  const gymSessionDatabase = firebase.database().ref(`/gyms/${session.gymKey}/groupSessions/${sessionKey}`);
  if (geolib.getDistance(userRegion, session.location) > 300) {
    Alert.alert('You must be within 1000 feet to press ready!');
    return;
  }
  sessionDatabase.update({ started: true, start: new Date() });
  gymSessionDatabase.update({ started: true, start: new Date() });
}

export async function createGroupSession(trainer, start, duration, name, bio, capacity, cost) {
  const location = (await firebase.database().ref(`/gyms/${trainer.gym}/location`).once('value')).val();
  const gymName = (await firebase.database().ref(`/gyms/${trainer.gym}/name`).once('value')).val();
  const session = {
    gymKey: trainer.gym,
    gym: gymName,
    location,
    trainer: trainer.key,
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
  };
  // add session to groupSessions table and to groupSessions portion of gyms table
  const sessionKey = firebase.database().ref('groupSessions').push(session).key;
  await firebase.database().ref(`gyms/${trainer.gym}/groupSessions/${sessionKey}`).set(session);
  const userId = firebase.auth().currentUser.uid;
  const end = new Date(new Date(start).getTime() + (60000 * duration));
  await firebase.database().ref(`users/${userId}/schedule/${sessionKey}`).set({
    start: start.toString(),
    end: end.toString(),
    type: Constants.groupSessionType,
  });
}

export async function updateGroupSession(
  trainer,
  session,
  start,
  duration,
  name,
  bio,
  capacity,
  cost,
) {
  const location = (await firebase.database().ref(`/gyms/${trainer.gym}/location`).once('value')).val();
  const gymName = (await firebase.database().ref(`/gyms/${trainer.gym}/name`).once('value')).val();
  const updatedSession = {
    gymKey: trainer.gym,
    gym: gymName,
    location,
    trainer: trainer.key,
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
  };
  await firebase.database().ref(`groupSessions/${session.key}`).update(updatedSession);
  await firebase.database().ref(`gyms/${trainer.gym}/groupSessions/${session.key}`).update(updatedSession);
  const end = new Date(new Date(start).getTime() + (60000 * duration));
  const userId = firebase.auth().currentUser.uid;
  await firebase.database().ref(`users/${userId}/schedule/${session.key}`).set({
    start: start.toString(),
    end: end.toString(),
  });
}

export async function joinGroupSession(session, user, userId) {
  const clientInfo = {
    key: userId,
    name: user.name,
    stripeId: user.stripeId,
    phone: user.phone,
  };
  const currentClientCount = (await firebase.database().ref(`groupSessions/${session.key}/clientCount`).once('value')).val();
  await firebase.database().ref(`groupSessions/${session.key}/clients/${userId}`).set(clientInfo);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clients/${userId}`).set(clientInfo);
  await firebase.database().ref(`groupSessions/${session.key}/clientCount`).set(currentClientCount + 1);
  await firebase.database().ref(`gyms/${session.gymKey}/groupSessions/${session.key}/clientCount`).set(currentClientCount + 1);
  const end = new Date(new Date(session.start).getTime() + (60000 * session.duration));
  await firebase.database().ref(`users/${userId}/schedule/${session.key}`).set({
    start: session.start.toString(),
    end: end.toString(),
    type: Constants.groupSessionType,
  });
}
