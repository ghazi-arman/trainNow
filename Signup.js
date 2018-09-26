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
			<KeyboardAvoidingView
				behavior = "padding"
				style = {styles.container}
				>
				<View style = {styles.logoContainer}>
					<Image style = {styles.logo} source = {require('./logo.png')}/>
				</View>
				<View style={styles.formContainer}>
					<SignupForm />
					<View style={styles.linkContainer}>
						<View style={styles.textContain}>
							<TouchableOpacity onPressIn={this.goback}>
								<Text style={styles.linkText}>Have an Account?</Text>
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
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: '#E0E4CC'
	},
	formContainer: {
		height: '40%',
		width: '80%'
	},
	logo: {
		width: '45%',
		height: '45%'
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
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: '10%',
		paddingTop: 25
	},
	linkText: {
		color: '#FA6900',
		fontSize: 16,
		fontWeight: '500',
	}
});
