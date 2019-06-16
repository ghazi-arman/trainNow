import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { AppLoading, Font } from 'expo';
import { Actions } from 'react-native-router-flux';
import * as firebase from 'firebase';
import { Icons } from 'react-native-fontawesome';
import COLORS from './Colors';
import TextField from './components/TextField';

export class LoginForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      fontLoaded: false
    };

    this.login = this.login.bind(this);
  }

  async componentDidMount() {
    if (!this.state.fontLoaded) {
      this.loadFont();
    }
  }

  loadFont = async () => {
    await Expo.Font.loadAsync({
      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
    });
    this.setState({ fontLoaded: true });
  }

  login() {
    //Gym Owner Sign up Link
    if (this.state.email.toLowerCase() == 'owner signup') {
      Actions.reset('ownersignup');
      return;
    }

    // input validation
    if (!this.state.email.length) {
      Alert.alert("Please enter email!");
      return;
    }
    if (this.state.password.length < 6) {
      Alert.alert("Password must be more than six characters!");
      return;
    }

    // Check email and password here
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function (snapshot) {
      var usersRef = firebase.database().ref('users');
      usersRef.orderByKey().equalTo(snapshot.uid).once("child_added", function (data) {
        var currentUser = data.val();

        // Verification for trainers under gym owners
        if (currentUser.deleted) {
          Alert.alert('Your account has been deleted. Please contact your gym manager.');
        } else if (currentUser.owner && !currentUser.pending) {
          Actions.owner({ gym: currentUser.gym });
        } else if (currentUser.owner && currentUser.pending) {
          Alert.alert('Your account is pending');
        } else if (currentUser.trainer) {
          Actions.reset('modal');
        } else {
          Actions.reset('map');
        }
      });
    }.bind(this)).catch(function (error) {
      
      // Authentication Error check
      var errorCode = error.code;
      var errorMessage = error.message;
      if (errorCode === 'auth/wrong-password') {
        Alert.alert('Wrong password.');
      }
      Alert.alert('There was a problem logging in. Check your connection and try again.')
    }.bind(this));

  }

  render() {
    if (!this.state.fontLoaded) {
      return <Expo.AppLoading />;
    }
    return (
      <View>
        <StatusBar barStyle="dark-content" />
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.user}
          placeholder="Email"
          keyboardType="email-address"
          onChange={(email) => this.setState({email})}
          value={this.state.email}
        />
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.lock}
          placeholder="Password"
          secure={true}
          onChange={(password) => this.setState({password})}
          value={this.state.password}
        />
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.login}>
          <Text style={styles.buttonText}>
            Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 20
  },
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