import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { LoginForm } from './LoginForm'
import { Actions } from 'react-native-router-flux';
import FontAwesome, { Icons } from 'react-native-fontawesome';

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
					<Image style = {styles.logo} source = {require('./logo.png')} />
				</View>
				<View style={styles.formContainer}>

					<LoginForm />
					<View style={styles.linkContainer}>
						<View style={styles.textContain}>
							<TouchableOpacity onPress={this.forgot}>
								<Text style={styles.linkText}>Forgot Password?</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.textContain}>
							<TouchableOpacity onPress={this.signup}>
								<Text style={styles.linkText}>New User?</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>	
			</KeyboardAvoidingView>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E0E4CC'
	},
	formContainer: {
		height: '45%',
		width: '80%'
	},
	logo: {
		width: '65%',
		height: '65%'
	},
	logoContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: '25%',
		width: '80%'
	},
	textContain:{
		height: 30
	},
	linkContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: "15%",
		paddingTop: 20
	},
	linkText: {
		color: '#FA6900',
		fontSize: 16,
		fontWeight: '500',
	}
});
