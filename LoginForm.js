import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, Keyboard } from 'react-native';
import {AppLoading, Font} from 'expo';
import { Actions } from 'react-native-router-flux';
import * as firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';

export class LoginForm extends Component {

	constructor(props) {
		super(props);
		this.state = {
			email: '',
			password: '',
			fontLoaded: false
		};

		this.onLoginPress=this.onLoginPress.bind(this);
	}

	async componentDidMount() {
		if(!this.state.fontLoaded){
			this.loadFont();
		}
	}

	loadFont = async () => {
		await Font.loadAsync({
	      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
	      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
	    });
	    this.setState({fontLoaded: true});
	}


	onLoginPress() {
		var uname = this.state.email;
		var pw = this.state.password;

		// email check
		if(!uname.length) {
			Alert.alert("Please enter email!");		
			return;			
		}	

		// pw length check
		if(!pw.length || pw.length < 6) {
			Alert.alert("Password must be more than six characters!");	
			return;
		}

		// Check email and password here
		firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password)
			.then(function() {

				Actions.map();
			}.bind(this)).catch(function(error) {

				//Authentication Error check
				var errorCode = error.code;
				var errorMessage = error.message;
				if (errorCode === 'auth/wrong-password') {
					Alert.alert('Wrong password.');
				} 
			}.bind(this));

	}

	render() {
		if(!this.state.fontLoaded){
			return <Expo.AppLoading />;
		}
		return (
			<View>
			<StatusBar barStyle="dark-content" />
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput 
						placeholder="Email"
						returnKeyType="next"
						onSubmitEditing={() => this.passwordInput.focus()}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#69D2E7'
						onChangeText={(email) => this.setState({email})}
						value={this.state.email} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.lock}</FontAwesome>
					</Text>
					<TextInput
						autoCorrect={false}
						placeholder="Password"
						returnKeyType="go"
						secureTextEntry
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#69D2E7'
						onChangeText={(password) => this.setState({password})}
						value={this.state.password}
						ref={(input) => this.passwordInput = input}/>
				</View>
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
	inputRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-start',
		marginBottom: 20
	},
	input: {
		height: 40,
		borderWidth: 0,
		outline: 0,
		background: 'transparent',
		borderBottomWidth: 1,
		borderColor: '#F38630',
		width: '90%'
	},
	buttonContainer: {
		backgroundColor: '#69D2E7',
		paddingVertical: 15,
		marginTop: 20
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	icon: {
		color: '#69D2E7',
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	}
});