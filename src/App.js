import bugsnag from '@bugsnag/expo';
import React, { Component } from 'react';
import firebase from 'firebase';
import { Routes } from './Routes';
import { ScreenOrientation, AppLoading } from 'expo';
import * as Font from 'expo-font';
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

  constructor(props) {
    super(props);
    this.state = {
      fontLoaded: false,
      firebaseLoaded: false
    };
  }
  
  async componentDidMount(){
    // initialize firebase
    if(!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    // initialize bugsnag for bug tracking
    bugsnag();

    // Keep screen in portrait mode and load font for Icons
    ScreenOrientation.lockAsync(ScreenOrientation.Orientation.PORTRAIT_UP);
    await Font.loadAsync({
      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf')
    });

    this.setState({
      fontLoaded: true,
      firebaseLoaded:true
    });
  }
  
  render() {
    if (!this.state.fontLoaded || !this.state.firebaseLoaded) {
      return <AppLoading />;
    }
    return <Routes />;
  }
}