import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Keyboard
} from 'react-native';

import { Actions } from 'react-native-router-flux';
import * as firebase from 'firebase';

export class LoginForm extends Component {

	constructor(props) {
		super(props);
		this.state = {
			email: '',
			password: '',
			state: ''
		};
		this.onLoginPress=this.onLoginPress.bind(this);
	}

	onLoginPress() {
		Keyboard.dismiss();
		// client side authentication
		var uname = this.state.email;
		var pw = this.state.password;
		var specialChars = "@!#$%^&*()_+[]{}?:;|'\"\\,./~`-=";

		// email not empty
		if(!uname.length) {
			Alert.alert("Please enter email!");
		    this.setState({
		    	email: '',
		    	password: '',
		    });			
			return;			
		}	

		var speicalCharCheck = function(pw) {
			for(i = 0; i < specialChars.length; i++) {
				if(pw.indexOf(specialChars[i]) > -1) {
					return true;
				}
			}
			return false;
		}

		// pw length, contains lower/upper case and special char
		if(pw.length < 6 || pw.length > 12) {
			Alert.alert("Invalid Password!");
		    this.setState({
		    	password: '',
		    });			
			return;
		}

		// authenticate email and password here
		firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password)
			.then(function() {
				// if authenticated, enter the map page
				this.setState({
					email: '',
					password: '',
					loaded: false,
				});				
				Actions.map();
			}.bind(this))
			.catch(function(error) {
				// Handle Errors here.
				var errorCode = error.code;
				var errorMessage = error.message;
				if (errorCode === 'auth/wrong-password') {
					Alert.alert('Wrong password.');
				} 
				else {
					Alert.alert(errorMessage);
				}	
				this.setState({
					password: '',
					loaded: false,
				});			
			}.bind(this));

	}

	render() {
		return (
			<View style = {styles.container}>
			<StatusBar 
				barStyle="light-content"
				/>
				<TextInput 
					placeholder="Email"
					returnKeyType="next"
					onSubmitEditing={() => this.passwordInput.focus()}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(email) => this.setState({email})}
					value={this.state.email}
					/>
				<TextInput
					placeholder="Password"
					returnKeyType="go"
					secureTextEntry
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(password) => this.setState({password})}
					value={this.state.password}
					ref={(input) => this.passwordInput = input}
					/>
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onLoginPress}>
					<Text 
						style={styles.buttonText}
						>Login</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
	},
	input: {
		height: 40,
		backgroundColor: 'rgba(255,255,255,0.2)',
		marginBottom: 10,
		color: '#FFF',
		paddingHorizontal: 10,
	},
	buttonContainer: {
		backgroundColor: '#C51162',
		paddingVertical: 15,
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	}
});