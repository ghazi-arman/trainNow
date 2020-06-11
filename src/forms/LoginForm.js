import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import Constants from '../components/Constants';
import TextField from '../components/TextField';
const loading = require('../images/loading.gif');

export class LoginForm extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  login = async() => {
    // Prevents multiple form
    if(this.state.pressed){
      return;
    }

    // Go to manager sign up page 
    if (this.state.email && this.state.email.toLowerCase() == 'manager signup') {
      Actions.ManagerSignupPage();
      return;
    }

    // Input validation
    if (!this.state.email || !this.state.email.length) {
      Alert.alert("Please enter an email!");
      return;
    }
    if (!this.state.password || this.state.password.length < 6) {
      Alert.alert("Password must be more than six characters!");
      return;
    }
    
    this.setState({ pressed: true });
    try {
      // Validate username and password combo through firebase
      const userCredentials = await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
      const userDatabaseObject = await firebase.database().ref(`/users/${userCredentials.user.uid}`).once('value');
      const user = userDatabaseObject.val();

      // Checks status of current user and routes appropriately
      if (user.deleted) {
        this.setState({ pressed: false });
        Alert.alert('Your account has been deleted. Please contact your gym manager.');
        return;
      }
      if (user.pending) {
        this.setState({ pressed: false });
        Alert.alert('Your account is pending');
        return;
      }
      if (user.type === Constants.managerType && !user.pending) {
        Actions.ManagerPage({ gym: user.gym });
        return;
      }
      if (user.type === Constants.trainerType) {
        Actions.reset('CalendarPage');
        return;
      }

      Actions.reset('MapPage');
    } catch(error) {
      this.setState({ pressed: false });
      if (error.code === "auth/invalid-email") {
				Alert.alert("Please enter a valid email.");
				return;
			}
      this.bugsnagClient.metaData = {
        email: this.state.email
      }
      this.bugsnagClient.notify(error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Wrong password.');
        return;
      }
      if (error.code === "auth/user-not-found") {
				Alert.alert("There is no account associated with this email.");
				return;
      }
      Alert.alert('There was an unexpected problem logging in. Please try again.');
    }
  }

  render() {
		if (this.state.pressed) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }

    return (
      <View>
        <TextField
          icon="user"
          placeholder="Email"
          keyboard="email-address"
          onChange={(email) => this.setState({email})}
          value={this.state.email}
        />
        <TextField
          icon="lock"
          placeholder="Password"
          secure={true}
          onChange={(password) => this.setState({password})}
          returnKeyType="go"
          onSubmitEditing={() => this.login()}
          value={this.state.password}
        />
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.login}>
          <Text style={styles.buttonText}> Login </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  buttonContainer: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    marginTop: 20
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  loading: {
    width: '100%',
    resizeMode: 'contain'
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
});