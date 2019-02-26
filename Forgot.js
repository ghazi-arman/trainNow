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
		Actions.reset('login');
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
		backgroundColor: '#252a34'
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
		height: '20%',
		width: '80%'
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
		color: '#08d9d6',
		fontSize: 16,
		fontWeight: '500',
	}
});
