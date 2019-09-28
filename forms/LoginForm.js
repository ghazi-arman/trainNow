import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { Icons } from 'react-native-fontawesome';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';

export class LoginForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      submitted: false
    };
    this.bugsnagClient = bugsnag();
  }

  login = async() => {
    // Prevents multiple form
    if(this.state.submitted){
      return;
    }

    // Go to owner sign up page 
    if (this.state.email && this.state.email.toLowerCase() == 'owner signup') {
      Actions.OwnerSignupPage();
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
    
    this.state.submitted = true;
    try {
      // Validate username and password combo through firebase
      const userCredentials = await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
      const userDatabaseObject = await firebase.database().ref(`/users/${userCredentials.user.uid}`).once('value');
      //console.log(userDatabaseObject);
      const user = userDatabaseObject.val();

      // Checks status of current user and routes appropriately
      if (user.deleted) {
        Alert.alert('Your account has been deleted. Please contact your gym manager.');
        return;
      }
      if (user.owner && !user.pending) {
        Actions.OwnerPage({ gym: user.gym });
        return;
      }
      if (user.owner && user.pending) {
        Alert.alert('Your account is pending');
        return;
      }
      if (user.trainer) {
        Actions.reset('SchedulePage');
        return;
      }

      Actions.reset('MapPage');
    } catch(error) {
      this.state.submitted = false;
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
    return (
      <View>
        <TextField
          icon={Icons.user}
          placeholder="Email"
          keyboard="email-address"
          onChange={(email) => this.setState({email})}
          value={this.state.email}
        />
        <TextField
          icon={Icons.lock}
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
  }
});