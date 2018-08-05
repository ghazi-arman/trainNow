import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert
} from 'react-native';

import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';



export class ForgotForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			email: '',
		};
		this.submit=this.submit.bind(this);
	}

	submit() {
		firebase.auth().sendPasswordResetEmail(this.state.email)
			.then(function() {
				Alert.alert("Password Reset Email Sent!");
				Actions.pop();
			})
			.catch(function(error) {
				Alert.alert(error.message);
			    this.setState({
			    	email: '',
			    });
			}.bind(this));
	}


	render() {
		return (
			<View style = {styles.container}>
			<StatusBar 
				barStyle="light-content"
				/>
				<TextInput 
					placeholder="username or email"
					placeholderTextColor='rgba(255,255,255,0.7)'
					returnKeyType="next"
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					style={styles.input}
					onChangeText={(email) => this.setState({email})}
					value={this.state.email}
					/>
				<TouchableOpacity style={styles.buttonContainer}>
					<Text 
						style={styles.buttonText}
						onPress={this.submit}
						>
						Submit
					</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
	},
	input: {
		height: 40,
		backgroundColor: 'rgba(255,255,255,0.2)',
		marginBottom: 10,
		color: '#FFF',
		paddingHorizontal: 10,
	},
	buttonContainer: {
		backgroundColor: '#2980b9',
		paddingVertical: 15,
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	}
});