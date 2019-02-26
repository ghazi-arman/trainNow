import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { LoginForm } from './LoginForm'
import { Actions } from 'react-native-router-flux';
import FontAwesome, { Icons } from 'react-native-fontawesome';

export class Login extends Component {

	signup() {
		Actions.reset('signup');
	}

	forgot() {
		Actions.reset('forgot');
	}

	render() {
		return (
			<View style = {styles.container}>
				<View style = {styles.logoContainer}>
					<Text style={styles.header}>Train</Text><Text style={styles.header2}>Now</Text>
				</View>
				<KeyboardAvoidingView behavior='padding' style={styles.formContainer}>
					<LoginForm />
				</KeyboardAvoidingView>	
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
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#E0E0E0'
	},
	formContainer: {
		height: '35%',
		width: '80%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	header: {
		color: '#0097A7',
		fontSize: 50,
		fontWeight: '600'
	},
	header2: {
		color: '#E91E63',
		fontSize: 50,
		fontWeight: '600'
	},
	textContain: {
		height: 30
	},
	logoContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: '20%',
		width: '80%'
	},
	linkContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: "20%",
	},
	linkText: {
		color: '#E91E63',
		fontSize: 16,
		fontWeight: '500',
	}
});
