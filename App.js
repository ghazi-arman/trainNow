import bugsnag from '@bugsnag/expo';
import React, { Component } from 'react';
import firebase from 'firebase';
import { Routes } from './Routes';
import { ScreenOrientation } from 'expo';

var config = {
  apiKey: "AIzaSyBJNVtTG-dr1rTA2OyNbjxDxsRi6bGv2qU",
  authDomain: "trainnow-53f19.firebaseapp.com",
  databaseURL: "https://trainnow-53f19.firebaseio.com",
  projectId: "trainnow-53f19",
  storageBucket: "trainnow-53f19.appspot.com",
  messagingSenderId: "402226410365"
};

export default class App extends Component {
  
  componentWillUnmount() {
    firebase.off();
  }

  componentDidMount(){
    if(!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const bugsnagClient = bugsnag();
    ScreenOrientation.lockAsync(ScreenOrientation.Orientation.PORTRAIT_UP);
  }
  
  render() {
    return (
      <Routes />
    );
  }
}