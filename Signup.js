import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Image,
  KeyboardAvoidingView,
  TouchableOpacity
} from 'react-native';
import { CheckBox } from 'react-native-checkbox';
import { SignupForm } from './SignupForm'
import { Actions } from 'react-native-router-flux';


export class Signup extends Component {
	goback() {
		Actions.pop();
	}
	render() {
		return (
			<KeyboardAvoidingView
				behavior = "padding"
				style = {styles.container}
				enabled>
				<View style = {styles.logoContainer}>
					<Image 
						style = {styles.logo}
						source = {require('./logo.png')}
						/>
					<Text style={styles.title}>PT Hero</Text>
				</View>
				<View style={styles.formContainer}>
					<SignupForm />
				</View>
				<View style={styles.buttonContainer}>
					<Text style={styles.button}>
						Already have an account yet?
					</Text>
					<TouchableOpacity onPressIn={this.goback}>
						<Text style={styles.buttonText}>  Sign in</Text>
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
	buttonContainer: {
		flexGrow: 1,
		alignItems: 'flex-end',
		justifyContent: 'center',
		paddingVertical: 16,
		flexDirection: 'row'
	},
	button: {
		color: 'rgba(255,255,255,0.6)',
		fontSize: 16
	},
	buttonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '500'
	},
});
