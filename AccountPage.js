import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert
} from 'react-native';
import {Permissions, Location, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';

export class AccountPage extends Component {

	constructor(props) {
		super(props);
	}

	// user log out confirm
	logout() {
		Alert.alert(
		  "Are you sure you wish to logout?", 
		  "",
		  [
		    {text: 'Cancel'},
		    {text: 'Yes', onPress: () => {
		      firebase.auth().signOut().then(function() {
		        Alert.alert('Signed Out');
		        Actions.reset('login');
		      }, function(error) {
		        Alert.alert('Sign Out Error', error);
		      });
		    }},
		  ],
		);
	}

	backtomap() {
		Actions.pop();
	}

	// load font after render the page
	async componentDidMount() {
		await Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		this.setState({ fontLoaded: true });
	}

	render() {
		return (
			<KeyboardAvoidingView 
				behavior="padding"
				style = {styles.container}
				>
				<TouchableOpacity 
					style={styles.gobackContainer}
					onPressIn={this.backtomap}>
					<Text 
						style={styles.gobackText}
						>	 Back to map</Text>
				</TouchableOpacity>			
				<View style = {styles.formContainer}>
					<AccountForm />
				</View>
				<TouchableOpacity 
					style={styles.buttonContainer}
					onPressIn={this.logout}>
					<Text 
						style={styles.buttonText}
						>Logout</Text>
				</TouchableOpacity>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#3498db',
	},
	gobackContainer: {
		backgroundColor: '#2980b9',
		paddingVertical: 20,
		top: '5%'
	},
	formContainer: {
		marginTop: 30
	},
	gobackText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	logo: {
		width: 100,
		height: 100,
	},
	logoContainer: {
		alignItems: 'center',
		flexGrow: 1,
		justifyContent: 'center',
	},
	title: {
		color: "#FFF",
		marginTop: 10,
		textAlign: 'center',
		opacity: 0.9,
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
