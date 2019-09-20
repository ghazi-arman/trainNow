import bugsnag from '@bugsnag/expo';
import React, { Component } from 'react';
import firebase from 'firebase';
import { Routes } from './Routes';
import { ScreenOrientation } from 'expo';
import { API_KEY, AUTH_DOMAIN, DB_URL, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID } from 'react-native-dotenv';

const config = {
  apiKey: API_KEY,
  authDomain: AUTH_DOMAIN,
  databaseURL: DB_URL,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID
};

export default class App extends Component {
  
  componentWillUnmount() {
    firebase.off();
  }

  componentDidMount(){
    if(!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    bugsnag();
    ScreenOrientation.lockAsync(ScreenOrientation.Orientation.PORTRAIT_UP);
  }
  
  render() {
    return (
      <Routes />
    );
  }
}