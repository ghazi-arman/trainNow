import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {Permissions, Location, ImagePicker, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';
import { AccountBar } from './AccountBar';
import { SessionModal } from './SessionModal';

export class AccountPage extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
      		pendingModal: false
      	}
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
		Actions.map();
	}

	hidependingModal = () => this.setState({pendingModal: false});

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
				<Modal 
					isVisible={this.state.pendingModal}
        			onBackdropPress={this.hidependingModal}>
          			<SessionModal />
        		</Modal>
				<AccountBar map={this.backtomap} logout={this.logout} pending={() => this.setState({ pendingModal: true })} history={() => Actions.history()}/>
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
		marginTop: 40,
    	fontSize: 38,
    	color: '#08d9d6',
    	fontWeight: '700',
  	},
	form: {
		width: '90%',
		height: '100%',
		paddingBottom: 50
	}
});
