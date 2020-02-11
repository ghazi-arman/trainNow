import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import geolib from 'geolib';
import { Actions } from 'react-native-router-flux';
import { FB_URL } from 'react-native-dotenv';
import * as Permissions from 'expo-permissions';

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
    abbr = ' PM';
  } else {
    abbr = ' AM'
  }

  var displayDate = month + '/' + day + ' ' + hour + ':' + minute + abbr;
  return displayDate;
}

// Convert date to readable time format
export function timeToString(start) {
  var pendingDate = new Date(start);
  var hour = pendingDate.getHours();
  var minute = pendingDate.getMinutes();
  var abbr;

  if (minute < 10) {
    minute = '0' + minute;
  }
  // Sets abbr to AM or PM
  if (hour > 12) {
    hour = hour - 12;
    abbr = ' PM';
  } else {
    abbr = ' AM'
  }

  var displayDate = hour + ':' + minute + abbr;
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

// Loads user except for sensitive data
export async function loadOtherUser(userKey) {
  const cardAdded = await firebase.database().ref(`/users/${userKey}/cardAdded`).once('value');
  const name = await firebase.database().ref(`/users/${userKey}/name`).once('value');
  const phone = await firebase.database().ref(`/users/${userKey}/phone`).once('value');
  const rating = await firebase.database().ref(`/users/${userKey}/rating`).once('value');
  const sessions = await firebase.database().ref(`/users/${userKey}/sessions`).once('value');
  const trainer = await firebase.database().ref(`/users/${userKey}/trainer`).once('value');
  return {
    key: userKey,
    cardAdded: cardAdded.val(),
    name: name.val(),
    phone: phone.val(),
    rating: rating.val(),
    sessions: sessions.val(),
    trainer: trainer.val()
  }
}

// Loads trainer except for sensitive data
export async function loadOtherTrainer(userKey) {
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
  const trainer = await firebase.database().ref(`/users/${userKey}/trainer`).once('value');
  const type = await firebase.database().ref(`/users/${userKey}/type`).once('value');
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
    trainer: trainer.val(),
    type: type.val(),
    offset: offset.val() || 0
  };
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
  const userId = firebase.auth().currentUser.uid;
  const userStripeField = (session.sentBy === 'trainer') ? 'traineeStripe' : 'trainerStripe';
  const otherUserStripeField = (session.sentBy === 'trainer') ? 'trainerStripe' : 'traineeStripe';
  const otherUserStripe = (session.sentBy === 'trainer') ? session.trainerStripe : session.traineeStripe;
  const user = await loadUser(userId);
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
    gymKey: session.gymKey,
    sentBy: session.sentBy,
    regular: session.regular,
    [userStripeField]: user.stripeId,
    [otherUserStripeField]: otherUserStripe,
    traineePhone: session.traineePhone,
    trainerPhone: session.trainerPhone,
    met: false,
    read: false,
    trainerType: session.trainerType
  });

  const otherUserKey = (userId === session.trainee) ? session.trainer : session.trainee;

  firebase.database().ref(`/users/${userId}/scheduleApprovedUser`).child(otherUserKey).set(true);
  firebase.database().ref(`/users/${userId}/sessionApprovedUser`).child(otherUserKey).set(true);

  // remove session from pending sessions table and from pending schedule of user who initiated it
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  firebase.database().ref(`/users/${otherUserKey}/pendingschedule/`).child(sessionKey).remove();

  // add session to trainer's and trainee's schedule
  firebase.database().ref(`users/${userId}/schedule/`).child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString()
  });

  firebase.database().ref(`users/${otherUserKey}/schedule/`).child(sessionKey).set({
    start: startTime.toString(),
    end: endTime.toString()
  });
}

// Removes pending session from sessions table and schedules
export async function cancelPendingSession(session, sessionKey){
  const userId = firebase.auth().currentUser.uid;
  firebase.database().ref('pendingSessions').child(sessionKey).remove();
  const userSentBy = (session.sentBy === 'trainee') ? session.trainee : session.trainer;
  firebase.database().ref(`/users/${userSentBy}/pendingschedule/`).child(sessionKey).remove();
}

// Removes accepted session from sessions table and schedules and stores it in canceled sessions table
export async function cancelAcceptedSession(session, sessionKey){
  const userId = firebase.auth().currentUser.uid;
  session.cancelledBy = userId;
  firebase.database().ref('cancelSessions').child(userId).push(session);
  firebase.database().ref('trainSessions').child(sessionKey).remove();
  firebase.database().ref(`/users/${session.trainee}/schedule/`).child(sessionKey).remove();
  firebase.database().ref(`/users/${session.trainer}/schedule/`).child(sessionKey).remove();
}

// Sends text message using twilio
export async function sendMessage(number, message){
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  const res = await fetch(`${FB_URL}/twilio/sendMessage/`, {
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

export async function createPendingSession(trainee, trainer, gym, date, duration, sentBy, regular){
  const userStripeField = (sentBy === 'trainee') ? 'traineeStripe' : 'trainerStripe';
  const userStripe = (sentBy === 'trainee') ? trainee.stripeId : trainer.stripeId;
  var sessionKey = firebase.database().ref('pendingSessions').push({
    trainee: trainee.key,
    traineeName: trainee.name,
    trainer: trainer.key,
    trainerName: trainer.name,
    start: date.toString(),
    duration: duration,
    location: gym.location,
    gym: gym.name,
    gymKey: gym.key,
    rate: trainer.rate,
    read: false,
    [userStripeField]: userStripe,
    traineePhone: trainee.phone,
    trainerPhone: trainer.phone,
    trainerType: trainer.type,
    sentBy,
    regular
  }).key;
  let end = new Date(new Date(date).getTime() + (60000 * duration))
  const userId = firebase.auth().currentUser.uid;
  const otherUserKey = (userId === trainee.key) ? trainer.key: trainee.key;
  firebase.database().ref(`users/${userId}/pendingschedule/`).child(sessionKey).set({
    start: date.toString(),
    end: end.toString()
  });
  firebase.database().ref(`users/${userId}/scheduleApprovedUser/`).child(otherUserKey).set(true);
  firebase.database().ref(`users/${userId}/sessionApprovedUser/`).child(otherUserKey).set(true);
}

export async function loadGym(gymKey) {
  let gym;
  await firebase.database().ref('gyms').child(gymKey).once('value', function (snapshot) {
    gym = snapshot.val();
    gym.key = gymKey;
  });
  return gym;
}

export function renderStars(rating){
  var star = [];
  for (let stars = 0; stars < 5; stars++) {
    if (rating >= 1) {
      star.push(<FontAwesome key={stars} name="star" size={15} />);
    } else if(rating > 0) {
      star.push(<FontAwesome key={stars} name="star-half-full" size={15} />);
    } else {
      star.push(<FontAwesome key={stars} name="star-o" size={15} />);
    }
    rating--;
  }
  return star;
}

export async function loadRecentTrainers(clientKey){
  const trainers = [];
  const trainerMap = [];
  await firebase.database().ref(`pastSessions/${clientKey}`).once('value', function(data) {
    data.forEach(function(sessionValue) {
      const session = sessionValue.val().session;
      if(!trainerMap.includes(session.trainer)){
        trainers.push({
          name: session.trainerName,
          key: session.trainer,
          date: session.start,
          gym: session.gym
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
  await firebase.database().ref(`pastSessions/${trainerKey}`).once('value', function(data) {
    data.forEach(function(sessionValue) {
      const session = sessionValue.val().session;
      if(!clientMap.includes(session.trainee)){
        clients.push({
          name: session.traineeName,
          key: session.trainee,
          date: session.start,
          gym: session.gym
        });
        clientMap.push(session.trainee);
      }
    });
  });
  return clients;
}

export async function loadClientRequests(clientKey) {
  const requests = [];
  try {
    
    const clientRequests = await firebase.database().ref('clientRequests').child(clientKey).once('value');
    clientRequests.forEach(sessionValue => {
      const session = sessionValue.val();
      session.key = sessionValue.key;
      requests.push(session);
    });
  } catch(error) {
    throw error;
  }
	return requests;
}

export async function loadTrainerRequests(trainerKey) {
  const requests = [];
  try {
    const trainerRequests = await firebase.database().ref('trainerRequests').child(trainerKey).once('value');
    trainerRequests.forEach(sessionValue => {
      const session = sessionValue.val();
      session.key = sessionValue.key;
      requests.push(session);
    });
    return requests;
  } catch(error) {
    throw error;
  }
}

export async function denyClientRequest(requestKey, traineeKey, trainerKey) {
  await firebase.database().ref('clientRequests').child(traineeKey).child(requestKey).remove();
  await firebase.database().ref('users').child(trainerKey).child('requests').child(traineeKey).remove();
}

export async function denyTrainerRequest(requestKey, clientKey, trainerKey) {
  await firebase.database().ref('trainerRequests').child(trainerKey).child(requestKey).remove();
  await firebase.database().ref('users').child(clientKey).child('requests').child(trainerKey).remove();
}

export async function acceptTrainerRequest(requestKey, trainerKey, trainerName, clientKey, traineeName, gymKey){
  await firebase.database().ref('trainerRequests').child(trainerKey).child(requestKey).remove();
  await firebase.database().ref('users').child(clientKey).child('requests').child(trainerKey).remove();

  await firebase.database().ref(`users/${trainerKey}/clients/${clientKey}`).set({
    trainee: clientKey,
    traineeName
  });

  await firebase.database().ref(`users/${clientKey}/trainers/${trainerKey}`).set({
    trainerName: trainerName,
    trainer: trainerKey,
    gym: gymKey
  });
}

export async function acceptClientRequest(requestKey, trainerKey, trainerName, clientKey, traineeName, gymKey) {
  await firebase.database().ref('clientRequests').child(clientKey).child(requestKey).remove();
  await firebase.database().ref('users').child(trainerKey).child('requests').child(clientKey).remove();

  await firebase.database().ref(`users/${trainerKey}/clients/${clientKey}`).set({
    trainee: clientKey,
    traineeName
  });

  await firebase.database().ref(`users/${clientKey}/trainers/${trainerKey}`).set({
    trainerName: trainerName,
    trainer: trainerKey,
    gym: gymKey
  });
}

export async function sendTrainerRequest(trainerKey, traineeName, traineeKey, gymKey) {
  const userId = firebase.auth().currentUser.uid;
  const otherUserKey = (userId === traineeKey) ? trainerKey : traineeKey;
  await firebase.database().ref('trainerRequests').child(trainerKey).push({
    status: 'pending',
    trainee: traineeKey,
    traineeName: traineeName,
    gym: gymKey
  });
  await firebase.database().ref(`users/${traineeKey}/requests/${trainerKey}`).set(true);
  await firebase.database().ref(`users/${userId}/requestApprovedUser`).child(otherUserKey).set(true);
}

export async function sendClientRequest(traineeKey, trainerKey, trainerName, gymKey) {
  const userId = firebase.auth().currentUser.uid;
  const otherUserKey = (userId === traineeKey) ? trainerKey : traineeKey;
  await firebase.database().ref('clientRequests').child(traineeKey).push({
    status: 'pending',
    trainer: trainerKey,
    trainerName: trainerName,
    gym: gymKey
  });
  await firebase.database().ref(`users/${trainerKey}/requests/${traineeKey}`).set(true);
  await firebase.database().ref(`users/${userId}/requestApprovedUser`).child(otherUserKey).set(true);
}

export async function loadSessions(userKey) {
  const sessions = [];
  await firebase.database().ref('pastSessions/' + userKey).once('value', function(data) {
    data.forEach(function(sessionValue) {
      const session = sessionValue.val().session;
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
    latitude:  Number(JSON.stringify(location.coords.latitude)),
    longitude: Number(JSON.stringify(location.coords.longitude)),
    latitudeDelta: 0.0422,
    longitudeDelta: 0.0221
  };
}

export async function loadGyms(){
  try {
    const gyms = [];
    await firebase.database().ref('gyms').once('value', function(data) {
      data.forEach(function(gymValue) {
        var gym = gymValue.val();
        gym.key = gymValue.key;
        gyms.push(gym);
      });
    });
    return gyms;
  } catch (error) {
    throw error;
  }
}

export async function goToPendingRating(trainer, userKey){
  try {
    const queryValue = (trainer ? 'trainer' : 'trainee');
    const ratingField = `${queryValue}Rating`;
    await firebase.database().ref('trainSessions').orderByChild(queryValue).equalTo(userKey).once('value', function(snapshot){
      snapshot.forEach(function(sessionValue){
        const session = sessionValue.val();
        if(session.end && !session[ratingField]){
          Actions.RatingPage({session: sessionValue.key});
        }
      });
    });
  } catch (error) {
    throw error;
  }
}

export async function loadCurrentSession(trainer, userKey) {
  try {
    const queryValue = (trainer ? 'trainer' : 'trainee');
    const ratingField = `${queryValue}Rating`;
    let currentSession = null;
    await firebase.database().ref('trainSessions').orderByChild(queryValue).equalTo(userKey).once('value', function(snapshot){
      snapshot.forEach(function(sessionValue){
        const session = sessionValue.val();
        if(new Date(session.start) < new Date() && !session[ratingField]){
          currentSession = sessionValue.key
        }
      });
    });
    return currentSession;
  } catch (error) {
    throw error;
  }
}

export async function checkForUnreadSessions(trainer, userKey){
  try {
    const userType = (trainer ? 'trainer' : 'trainee');
    let unread = false;

    await firebase.database().ref('pendingSessions').orderByChild(userType).equalTo(userKey).once('value', function(snapshot) {
      snapshot.forEach(function(sessionValue){
        const session = sessionValue.val();
        if(!session.read && session.sentBy !== userType){
          unread = true;
        }
      });
    });

    await firebase.database().ref('trainSessions').orderByChild(userType).equalTo(userKey).once('value', function(snapshot) {
      snapshot.forEach(function(sessionValue){
        const session = sessionValue.val();
        if(!session.read && session.sentBy === userType){
            unread = true;
        }
      });
    });

    return unread;
  } catch (error) {
    throw error;
  }
}

export async function reportSession(session, reporter, report) {
  await firebase.database().ref('reportSessions').child(`${session.key}/${reporter}`).set({
    sessionKey: session.key,
    trainer: session.trainer,
    trainee: session.trainee,
    reportedBy: reporter,
    reason: report,
  });
}

export async function loadTrainerCards(stripeId) {
  if (!stripeId) {
    return [];
  }
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/listTrainerCards/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if (data.body.message === "Success" && data.body.cards) {
      return data.body.cards.data;
    }
    return [];
  } catch (error) {
    throw error;
  }
}

export async function loadBalance(stripeId) {
  if (!stripeId) {
    return [];
  }
  try {
    const user = firebase.auth().currentUser;
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/getBalance/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        user: user.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if (data.body.message === "Success" && data.body.balance) {
      return data.body.balance.available[0].amount + data.body.balance.pending[0].amount;;
    }
    return 0;
  } catch (error) {
    throw error;
  }
}

export async function deleteTrainerCard(stripeId, cardId) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/deleteTrainerCard/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        cardId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if (data.body.message !== "Success") {
      throw new Error('Stripe Error.');
    }
  } catch (error) {
    throw error;
  }
}

export async function deleteCard(stripeId, cardId, lastCard) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/deleteCard/`, {
      method: 'POST',
      headers:{
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        cardId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if (data.body.message !== "Success") {
      throw new Error('Stripe Error');
    }
    if (lastCard) {
      await firebase.database().ref(`/users/${firebase.auth().currentUser.uid}`).update({ cardAdded: false });
    }
  } catch(error) {
    throw error;
  }
}

export function getCardIcon(brand) {
  if (brand == 'Visa') {
    return (<FontAwesome name="cc-visa" size={20} />);
  } else if (brand == 'American Express') {
    return (<FontAwesome name="cc-amex" size={20} />);
  } else if (brand == 'MasterCard') {
    return (<FontAwesome name="cc-mastercard" size={20} />);
  } else if (brand == 'Discover') {
    return (<FontAwesome name="cc-Discover" size={20} />);
  } else if (brand == 'JCB') {
    return (<FontAwesome name="cc-jcb" size={20} />);
  } else if (brand == 'Diners Club') {
    return (<FontAwesome name="cc-diners-club" size={20} />);
  } else {
    return (<FontAwesome name="credit-card" size={20} />);
  }
}

export async function loadCards(stripeId) {
  if (!stripeId) {
    return [];
  }
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/listCards/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if(data.body.message === "Success" && data.body.cards){
      return data.body.cards.data;
    }
    return [];
  }catch(error){
    throw error;
  }
}

export async function setDefaultCard(stripeId, cardId) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/setDefaultCard/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        cardId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if(data.body.message !== "Success"){
      throw new Error('Stripe Error')
    }
  }catch(error) {
    throw error;
  }
}

export async function setDefaultTrainerCard(stripeId, cardId) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/setDefaultTrainerCard/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        stripeId,
        cardId,
        user: firebase.auth().currentUser.uid
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if(data.body.message !== "Success"){
      throw new Error('Stripe Error')
    }
  }catch(error) {
    throw error;
  }
}

export async function loadSession(sessionKey) {
  let sessionToReturn;
  await firebase.database().ref('trainSessions').orderByKey().equalTo(sessionKey).once('value', function(snapshot){
    snapshot.forEach(function(sessionValue){
      const session = sessionValue.val();
      session.key = sessionValue.key;
      sessionToReturn = session;
    });
  });
  return sessionToReturn;
}

export async function rateSession(sessionKey, rating, isTrainer){
  try {
    const session = await loadSession(sessionKey);
    const userId = firebase.auth().currentUser.uid;
    const otherUserKey = (isTrainer ? session.trainee : session.trainer);
    const otherUser = await loadOtherUser(otherUserKey);
    const ratingField = isTrainer ? 'trainerRating' : 'traineeRating';
    const newRating = (((parseFloat(otherUser.rating) * parseInt(otherUser.sessions)) + parseInt(rating)) / (parseInt(otherUser.sessions) + 1)).toFixed(2);
    if (!isTrainer) {
      firebase.database().ref(`/gyms/${session.gymKey}/trainers/${session.trainer}`).update({ rating: newRating });
    }
    await firebase.database().ref(`/users/${otherUserKey}`).update({ rating: newRating, sessions: (parseInt(otherUser.sessions) + 1)});
    await firebase.database().ref(`/users/${userId}/schedule/${session.key}`).remove();
    session[ratingField] = rating;
    await firebase.database().ref(`/pastSessions/${userId}/${session.key}`).set({ session });

    await firebase.database().ref(`/trainSessions/${session.key}`).update({[ratingField]: rating});

    if ((isTrainer && session.traineeRating) || (!isTrainer && session.trainerRating)) {
      firebase.database().ref(`/pastSessions/${session.trainee}/${session.key}/session/`).update({[ratingField]: rating});
      firebase.database().ref(`/trainSessions/${session.key}`).remove();
    }
  } catch(error) {
    throw error;
  }
}

export async function markSessionsAsRead(pendingSessions, acceptSessions, isTrainer) {
  // marks sessions as read in database to prevent new session alert message from appearing twice
  pendingSessions.map(async(session) => {
    if ((isTrainer && session.sentBy === 'trainee') || (!isTrainer && session.sentBy === 'trainer')) {
      await firebase.database().ref(`/pendingSessions/${session.key}`).update({ read: true });
    }
  });
  acceptSessions.map(async(session) => {
    if ((isTrainer && session.sentBy !== 'trainee') || (!isTrainer && session.sentBy !== 'trainer')) {
      await firebase.database().ref(`/trainSessions/${session.key}`).update({ read: true });
    }
  });
}

export async function chargeCard(traineeStripe, trainerStripe, amount, cut, session){
  try{
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    const res = await fetch(`${FB_URL}/stripe/charge/`, {
      method: 'POST',
      headers: {
        Authorization: idToken
      },
      body: JSON.stringify({
        charge: {
          amount,
          cut,
          traineeStripe,
          trainerStripe,
          currency: 'USD',
        },
      }),
    });
    const data = await res.json();
    data.body = JSON.parse(data.body);
    if(data.body.message !== 'Success'){
      throw new Error('Stripe Error');
    }
    message = `You were charged $ ${(amount/100).toFixed(2)} for your session with ${session.trainerName}. If this is not accurate please contact support.`
    sendMessage(session.traineePhone, message);
  } catch(error){
    throw error;
  }
}

export async function startSession(session, userRegion){
  if(geolib.getDistance(userRegion, session.location) > 300){
    Alert.alert("You must be within 1000 feet to press ready!");
    return;
  }

  const user = firebase.auth().currentUser;
  const sessionDatabase = firebase.database().ref(`/trainSessions/${session.key}`)
  if(session.trainer === user.uid){
    //If both are ready set metup true and start time
    if(session.traineeReady){
      sessionDatabase.update({trainerReady: true, met: true, start: new Date()});
    }else{
      sessionDatabase.update({trainerReady: true});
    }
  }else{
    //If both are ready set metup true and start time
    if(session.trainerReady){
      sessionDatabase.update({traineeReady: true, met: true, start: new Date()});
    }else{
      sessionDatabase.update({traineeReady: true});
    }
  }
}