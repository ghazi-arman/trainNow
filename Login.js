import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { LoginForm } from './LoginForm'
import { Actions } from 'react-native-router-flux';



export class Login extends Component {

	signup() {
		Actions.signup();
	}

	forgot() {
		Actions.forgot();
	}

	render() {
		return (
			<KeyboardAvoidingView 
				behavior="padding"
				style = {styles.container}
				>
				<View style = {styles.logoContainer}>
					<Image 
						style = {styles.logo}
						source = {require('./logo.png')}
						/>
					<Text style={styles.title}>PT Hero</Text>
				</View>
				<View style={styles.formContainer}>
					<LoginForm />
				</View>
				<View style={styles.forgotTextContainer}>
					<Text style={styles.signupText}>
						Forgot your password? 
					</Text>
					<TouchableOpacity onPress={this.forgot}>
						<Text style={styles.signupButton}>  Reset</Text>
					</TouchableOpacity>
				</View>				
				<View style={styles.signupTextContainer}>
					<Text style={styles.signupText}>
						Don't have an account yet? 
					</Text>
					<TouchableOpacity onPress={this.signup}>
						<Text style={styles.signupButton}>  Sign up</Text>
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#263238',
	},
	logo: {
		width: 100,
		height: 100
	},
	logoContainer: {
		alignItems: 'center',
		flexGrow: 1,
		justifyContent: 'center',
	},
	title: {
		color: "#FFFFFF",
		marginTop: 10,
		fontSize: 35,
		textAlign: 'center'
	},
	forgotTextContainer: {
		flexGrow: 1,
		alignItems: 'flex-end',
		justifyContent: 'center',
		flexDirection: 'row'
	},
	signupTextContainer: {
		flexGrow: 1,
		alignItems: 'flex-end',
		justifyContent: 'center',
		paddingVertical: 16,
		flexDirection: 'row'
	},
	signupText: {
		color: 'rgba(255,255,255,0.6)',
		fontSize: 16
	},
	signupButton: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '500'
	},
});
