import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { loadUser } from '../components/Functions';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import TextField from '../components/TextField';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class LoginForm extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  login = async () => {
    if (this.state.submitted) {
      return;
    }

    if (this.state.email && this.state.email.toLowerCase() === 'manager signup') {
      Actions.ManagerSignupPage();
      return;
    }

    if (!this.state.email) {
      Alert.alert('Please enter an email.');
      return;
    }
    if (!this.state.password) {
      Alert.alert('Please enter a password.');
      return;
    }

    this.setState({ submitted: true });
    try {
      await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
      const user = await loadUser(firebase.auth().currentUser.uid);

      // Checks status of current user and routes appropriately
      if (user.deleted) {
        this.setState({ submitted: false });
        Alert.alert('Your account has been deleted. Please contact your gym manager.');
        return;
      }
      if (user.pending) {
        this.setState({ submitted: false });
        Alert.alert('Your account is pending approval.');
        return;
      }
      if (user.type === Constants.managerType && !user.pending) {
        Actions.ManagerPage({ gymKey: user.gymKey });
        return;
      }
      if (user.type === Constants.trainerType) {
        Actions.reset('CalendarPage');
        return;
      }

      Actions.reset('MapPage');
    } catch (error) {
      this.setState({ submitted: false });
      if (error.code === 'auth/invalid-email') {
        Alert.alert('Please enter a valid email.');
        return;
      }
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Wrong password.');
        return;
      }
      if (error.code === 'auth/user-not-found') {
        Alert.alert('There is no account associated with this email.');
        return;
      }
      Alert.alert('There was an unexpected problem logging in. Please try again.');
      this.bugsnagClient.metaData = {
        email: this.state.email,
      };
      this.bugsnagClient.notify(error);
    }
  }

  render() {
    if (this.state.submitted) {
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
        <TextField
          icon="lock"
          placeholder="Password"
          secure
          onChange={(password) => this.setState({ password })}
          returnKeyType="go"
          onSubmitEditing={() => this.login()}
          value={this.state.password}
        />
        <TouchableOpacity style={CommonStyles.fullButton} onPress={this.login}>
          <Text style={CommonStyles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={Actions.ForgotPage}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={Actions.SignupPage}>
          <Text style={styles.linkText}>New User?</Text>
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
