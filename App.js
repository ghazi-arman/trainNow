/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';
import firebase from 'firebase';
import { Login } from './Login';
import { Signup } from './Signup';
import { Routes } from './Routes';


var config = {
  apiKey: "AIzaSyBJNVtTG-dr1rTA2OyNbjxDxsRi6bGv2qU",
  authDomain: "trainnow-53f19.firebaseapp.com",
  databaseURL: "https://trainnow-53f19.firebaseio.com",
  projectId: "trainnow-53f19",
  storageBucket: "trainnow-53f19.appspot.com",
  messagingSenderId: "402226410365"
};

if(!firebase.apps.length) {
  const app = firebase.initializeApp(config);
}

export default class App extends Component<{}> {
  
  componentWillUnmount() {
    firebase.off();
  }
  
  render() {
    return (
      <Routes />
    );
  }

}


const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
  },
  callout: {
    height: 20,
    width: 20,
    backgroundColor: 'white',
  }
});
