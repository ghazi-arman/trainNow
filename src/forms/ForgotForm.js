import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';

export class ForgotForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	submit = async() => {
		// Prevents multiple form submissions
		if (this.state.submitted) {
			return;
		}
		this.state.submitted = true;

		try {
			await firebase.auth().sendPasswordResetEmail(this.state.email);
			Alert.alert("A password reset email has been sent!");
			this.state.submitted = false;
		} catch(error) {
			if (error.code === "auth/user-not-found") {
				Alert.alert("There is no account associated with this email");
				return;
			}
			Alert.alert("There was an error when sending the email. Please try again.");
			this.bugsnagClient.notify(error);
		}
	}

	render() {
		return (
			<View>
				<TextField
					icon="user"
					placeholder="Email"
					keyboard="email-address"
					onChange={(email) => this.setState({email})}
					value={this.state.email}
				/>
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.submit}>
					<Text style={styles.buttonText}> Submit </Text>
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
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	}
});