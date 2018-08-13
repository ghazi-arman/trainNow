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
import {AppLoading, Font} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';



export class ForgotForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			email: '',
		};
		this.submit=this.submit.bind(this);
	}

	async componentDidMount() {
		if(!this.state.fontLoaded){
			this.loadFont();
		}
	}

	loadFont = async () => {
		await Font.loadAsync({
	      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
	      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
	    });
	    this.setState({fontLoaded: true});
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
				barStyle="dark-content"
				/>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
							<FontAwesome>{Icons.user}</FontAwesome>
						</Text>
					<TextInput 
						placeholder="username or email"
						placeholderTextColor='#69D2E7'
						returnKeyType="next"
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						style={styles.input}
						onChangeText={(email) => this.setState({email})}
						value={this.state.email}
						/>
				</View>
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
	inputRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-start',
		marginBottom: 20
	},
	input: {
		height: 40,
		borderWidth: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderColor: '#F38630',
		width: '90%'
	},
	buttonContainer: {
		backgroundColor: '#69D2E7',
		paddingVertical: 15,
		marginTop: 20
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	icon: {
		color: '#69D2E7',
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	}
});