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
import { HistoryBar } from './HistoryBar';
import { SessionModal } from './SessionModal';

export class HistoryPage extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
      		pendingModal: false
      	}
	}

	backtomap() {
		Actions.map();
	}

	gotoUser(){
		Actions.account();
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
				<ScrollView style = {styles.historyContainer}>
					
				</ScrollView>
				<Modal 
					isVisible={this.state.pendingModal}
        			onBackdropPress={this.hidependingModal}>
          			<SessionModal />
        		</Modal>
				<HistoryBar map={this.backtomap} account={this.gotoUser} pending={() => this.setState({ pendingModal: true })} history={() => Actions.history()}/>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'	
	},
	historyContainer: {
		width: '90%',
		height: '80%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
});
