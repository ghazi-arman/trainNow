import React, { Component } from 'react';
import { StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { ForgotForm } from '../forms/ForgotForm'
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
const logo=require('../images/logo.png');

export class ForgotPage extends Component {
	
	goback() {
		Actions.LoginPage();
	}

	render() {
		return (
			<KeyboardAvoidingView behavior="padding" style = {styles.container}>
				<View style = {styles.logoContainer}>
					<Image style={styles.logo} source={logo} />
				</View>
				<View style={styles.formContainer}>
					<ForgotForm />
				</View>
				<View style={styles.linkContainer}>
					<View style={styles.textContain}>
						<TouchableOpacity onPress={this.goback}>
							<Text style={styles.linkText}>Have an Account?</Text>
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
		backgroundColor: COLORS.WHITE
	},
	logoContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: '20%',
		width: '80%',
		marginTop: 25
	},
	logo: {
		flex: 1,
		resizeMode: 'contain'
	},
	textContain:{
		height: 30
	},
	formContainer: {
		height: '35%',
		width: '80%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center'
	},
	linkContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: "20%",
	},
	linkText: {
		color: COLORS.PRIMARY,
		fontSize: 16,
		fontWeight: '500',
	}
});