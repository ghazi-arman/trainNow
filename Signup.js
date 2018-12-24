import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { SignupForm } from './SignupForm';
import { Actions } from 'react-native-router-flux';
import {AppLoading, Font} from 'expo';

export class Signup extends Component {
	goback() {
		Actions.pop();
	}
	render() {
		return (
			<View
				style={styles.container}
				>
				<View style = {styles.logoContainer}>
					<Text style={styles.header}>Train</Text><Text style={styles.header2}>Now</Text>
				</View>
				<KeyboardAvoidingView style={styles.formContainer} behavior='padding'>
					<SignupForm />
				</KeyboardAvoidingView>
				<View style={styles.linkContainer}>
					<View style={styles.textContain}>
						<TouchableOpacity onPressIn={this.goback}>
							<Text style={styles.linkText}>Have an Account?</Text>
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
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: '#252a34'
	},
	formContainer: {
		height: '60%',
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
	logoContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: '15%',
		width: '80%',
		marginTop: 25
	},
	textContain:{
		height: 30
	},
	linkContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: '10%',
	},
	linkText: {
		color: '#08d9d6',
		fontSize: 16,
		fontWeight: '500',
	}
});
