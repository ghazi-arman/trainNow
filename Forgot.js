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
import { ForgotForm } from './ForgotForm'
import { Actions } from 'react-native-router-flux';


export class Forgot extends Component {
	
	goback() {
		Actions.pop();
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
					<Text style={styles.title}>Free Finder</Text>
				</View>
				<View style={styles.formContainer}>
					<ForgotForm />
				</View>
				<View style={styles.buttonContainer}>
					<Text style={styles.button}>
						Already have an account yet?
					</Text>
					<TouchableOpacity onPress={this.goback}>
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
		backgroundColor: '#3498db',
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
		color: "#FFF",
		marginTop: 10,
		textAlign: 'center',
		opacity: 0.9,
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
