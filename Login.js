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
					<Text style={styles.header}>Train</Text><Text style={styles.header2}>Now</Text>
				</View>
				<View style={styles.formContainer}>

					<LoginForm />
				</View>	
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
			</KeyboardAvoidingView>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#252a34'
	},
	formContainer: {
		height: '35%',
		width: '80%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	header: {
		color: '#08d9d6',
		fontSize: 50,
		fontWeight: '600'
	},
	header2: {
		color: '#ff2e63',
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
		color: '#08d9d6',
		fontSize: 16,
		fontWeight: '500',
	}
});
