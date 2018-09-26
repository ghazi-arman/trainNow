import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import {Permissions, Location, Font, ImagePicker} from 'expo';
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
		Actions.pop();
	}

	hidependingModal = () => this.setState({pendingModal: false});

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
				<ScrollView style = {styles.formContainer}>
					<AccountForm />
				</ScrollView>
				<Modal 
					isVisible={this.state.pendingModal}
        			onBackdropPress={this.hidependingModal}>
          			<SessionModal />
        		</Modal>
				<AccountBar map={this.backtomap} logout={this.logout} pending={() => this.setState({ pendingModal: true })}/>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#E0E4CC',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center'	
	},
	formContainer: {
		width: '90%',
		height: '80%',
		marginTop: 20
	},
});
