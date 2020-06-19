import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Image,
} from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';

const loading = require('../images/loading.gif');

export default class ForgotForm extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  submit = async () => {
    // Prevents multiple form submissions
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });

    try {
      await firebase.auth().sendPasswordResetEmail(this.state.email);
      Alert.alert('A password reset email has been sent!');
      this.setState({ pressed: false });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert('There is no account associated with this email');
        return;
      }
      Alert.alert('There was an error when sending the email. Please try again.');
      this.bugsnagClient.notify(error);
    }
  }

  render() {
    if (this.state.pressed) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        <TextField
          icon="user"
          placeholder="Email"
          keyboard="email-address"
          onChange={(email) => this.setState({ email })}
          value={this.state.email}
        />
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.submit}>
          <Text style={styles.buttonText}> Submit </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    marginTop: 20,
    borderRadius: 5,
    width: '80%',
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700',
    fontSize: 20,
  },
});
