import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { SignupForm } from './SignupForm';
import { Actions } from 'react-native-router-flux';
import {AppLoading, Font} from 'expo';
const logo=require('./images/logo.png');
import COLORS from './Colors';

export class Signup extends Component {
	goback() {
		Actions.reset('login');
	}
	render() {
		return (
			<View style={styles.container} behavior='padding'>
				<View style = {styles.logoContainer}>
					<Image style={styles.logo} source={logo} />
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
		backgroundColor: COLORS.WHITE
	},
	logo: {
		flex: 1,
		resizeMode: 'contain'
	},
	formContainer: {
		height: '70%',
		width: '80%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	logoContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: '20%',
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
		height: '15%',
	},
	linkText: {
		color: COLORS.PRIMARY,
		fontSize: 16,
		fontWeight: '500',
	}
});
