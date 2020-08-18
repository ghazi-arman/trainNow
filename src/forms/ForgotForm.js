import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
} from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import TextField from '../components/TextField';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class ForgotForm extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  submit = async () => {
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });

    try {
      await firebase.auth().sendPasswordResetEmail(this.state.email);
      Alert.alert('A password reset email has been sent!');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        Alert.alert('There is no account associated with this email');
        return;
      }
      Alert.alert('There was an error when sending the email. Please try again.');
      this.bugsnagClient.notify(error);
    } finally {
      this.setState({ pressed: false });
    }
  }

  render() {
    if (this.state.pressed) {
      return <LoadingWheel />;
    }

    return (
      <View style={CommonStyles.centeredContainer}>
        <TextField
          icon="user"
          placeholder="Email"
          keyboard="email-address"
          onChange={(email) => this.setState({ email })}
          value={this.state.email}
        />
        <TouchableOpacity style={CommonStyles.fullButton} onPress={this.submit}>
          <Text style={CommonStyles.buttonText}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={Actions.LoginPage}>
          <Text style={styles.linkText}>Have an Account?</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  linkText: {
    color: Colors.Secondary,
    fontSize: 15,
    margin: 5,
  },
});
