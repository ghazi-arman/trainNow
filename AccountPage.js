import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {Permissions, Location, ImagePicker, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';
import { AccountBar } from './AccountBar';

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

	// load font after render the page
	async componentDidMount() {
		await Expo.Font.loadAsync({
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
				<Text style={styles.title}>Settings</Text>
				<View style={styles.form}>		
					<ScrollView>
						<AccountForm />
					</ScrollView>
				</View>
				<AccountBar map={() => Actions.reset('map')} logout={this.logout} pending={() => Actions.reset('modal')} history={() => Actions.reset('history')}/>
			</KeyboardAvoidingView>	
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	title: {
		marginTop: 30,
		paddingVertical: 5,
    	fontSize: 34,
    	color: '#08d9d6',
    	fontWeight: '700',
  	},
	form: {
		width: '90%',
		height: '100%',
		paddingBottom: 50
	}
});
