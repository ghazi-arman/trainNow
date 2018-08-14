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
					<Image style = {styles.logo} source = {require('./logo.png')} />
				</View>
				<View style={styles.formContainer}>
					<ForgotForm />
					<View style={styles.linkContainer}>
						<View style={styles.textContain}>
							<TouchableOpacity onPress={this.goback}>
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
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E0E4CC'
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
	formContainer: {
		height: '45%',
		width: '80%'
	},
	linkContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		height: "15%",
		paddingTop: 10
	},
	linkText: {
		color: '#FA6900',
		fontSize: 16,
		fontWeight: '500',
	}
});
