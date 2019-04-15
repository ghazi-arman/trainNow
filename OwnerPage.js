import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {Permissions, Location, ImagePicker, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import COLORS from './Colors';

export class OwnerPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			gym: 'null',
			pendingTrainers: null,
			trainers: null
		}
		this.loadGym=this.loadGym.bind(this);
		this.renderPending=this.renderPending.bind(this);
		this.renderTrainers=this.renderTrainers.bind(this);
		this.denyTrainer=this.denyTrainer.bind(this);
		this.acceptTrainer=this.acceptTrainer.bind(this);
		this.deleteTrainer=this.deleteTrainer.bind(this);
	}

	async componentDidMount() {
		await Expo.Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		//Get user info for state
		var user = firebase.auth().currentUser;
	    var usersRef = await firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', async function(snapshot) {
	    	var user = snapshot.val();
	    	this.loadGym(this.props.gym);
	    }.bind(this));
	}

	//Loads selected gyms Info from db
	async loadGym(gymKey){
		await firebase.database().ref('/gyms/' + gymKey).once('value', function(snapshot){
			var gym = snapshot.val();
	   		this.setState({gym: gym, pendingTrainers: gym.pendingTrainers, trainers: gym.trainers});
      	}.bind(this));
      	this.loadImages();
  	}

  	async denyTrainer(trainerKey) {
  		await firebase.database().ref('/gyms/' + this.props.gym).child('pendingTrainers').child(trainerKey).remove();
  		delete this.state.pendingTrainers[trainerKey];
  		this.forceUpdate();
  		Alert.alert('Trainer denied');
  	}

  	async deleteTrainer(trainerKey) {
  		await firebase.database().ref('/gyms/' + this.props.gym + '/trainers/').child(trainerKey).remove();
  		delete this.state.trainers[trainerKey];
  		this.forceUpdate();
  		Alert.alert('Trainer removed from gym.');
  	}

  	async acceptTrainer(trainerKey) {
  		console.log(trainerKey);
  	}

	renderPending(){
		if(this.state.pendingTrainers == null || this.state.pendingTrainers === undefined){
			return (<Text style={styles.navText}>None</Text>);
		}
		var result = Object.keys(this.state.pendingTrainers).map(function(key, trainer){
			return(
				<View key={trainer.name} style={styles.traineeRow}>
					<Text style={{width: 120}}>{trainer.name}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyTrainer(key)}> 
						<Text><FontAwesome>{Icons.close}</FontAwesome> Deny Trainer</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.acceptTrainer(key)}> 
						<Text><FontAwesome>{Icons.check}</FontAwesome> Accept Trainer</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderTrainers() {
		if(this.state.trainers == null || this.state.trainers === undefined){
			return (<Text style={styles.navText}>None</Text>);
		}
		var result = Object.keys(this.state.trainers).map(function(key){
			var trainer = this.state.trainers[key];
			return(
				<View key={trainer.name} style={styles.traineeRow}>
					<Text style={{width: 120}}>{trainer.name}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.deleteTrainer(key)}> 
						<Text><FontAwesome>{Icons.close}</FontAwesome> Delete Trainer</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => Actions.ownerhistory({userKey: key})}> 
						<Text><FontAwesome>{Icons.calendar}</FontAwesome> History</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	logout() {
	    Alert.alert(
	      "Are you sure you wish to sign out?", 
	      "",
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          firebase.auth().signOut().then(function() {
	            Actions.reset('login');
	          }, function(error) {
	            Alert.alert('Sign Out Error', error);
	          });
	        }},
	      ],
	    );
    }

	render() {
		if(this.state.gym == 'null'){
			return <Expo.AppLoading />
		}else{
			if(this.state.currentTab == 'pending'){
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'pending'})}>
							<Text style={styles.activeText}>Pending Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'current'})}>
							<Text style={styles.navText}>Current Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<View style={styles.trainerContainer}>
					<ScrollView style={{width: '90%'}} showsVerticalScrollIndicator={false}>
	            		{this.renderPending()}
	            	</ScrollView>
	            	</View>
				);
			}else{
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'pending'})}>
							<Text style={styles.navText}>Pending Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'current'})}>
							<Text style={styles.activeText}>Current Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<View style={styles.trainerContainer}>
					<ScrollView style={{width: '90%'}} showsVerticalScrollIndicator={false}>
	            		{this.renderTrainers()}
	            	</ScrollView>
	            	</View>
				);
			}
			return (
				<View style = {styles.container}>
					<Text style={styles.backButton} onPress={this.logout}>
	              		<FontAwesome>{Icons.powerOff}</FontAwesome>
	            	</Text>
	            	<Text style={styles.title}>Trainers</Text>
					{navBar}
					{content}
				</View>	
			);
		}
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	trainerContainer: {
		width: '90%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'flex-start'
	},
	title: {
		marginTop: 45,
    	fontSize: 34,
    	color: COLORS.PRIMARY,
    	fontWeight: '700',
  	},
  	navigationBar: {
		width: '100%',
		height: 100,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 5,
	},
	activeTab: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: '50%',
		height: 60,
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	inactiveTab: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: '50%',
		height: 60,
		backgroundColor: COLORS.WHITE,
		borderWidth: 1, 
		borderColor: COLORS.SECONDARY
	},
	navText: {
		fontSize: 25,
		color: COLORS.PRIMARY,
		textAlign: 'center'
	},
	activeText: {
		fontSize: 25,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
  	traineeRow: {
  		flexDirection: 'row',
  		justifyContent: 'space-between',
  		alignItems: 'center',
  		width: '100%',
  		marginTop: 10
  	},
	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
	},
	buttonText: {
		fontSize: 30,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
	requestButton: {
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 80,
		height: 40,
		marginLeft: 10
	},
	denyButton: {
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 80,
		height: 40,
	},
	icon: {
		fontSize: 15
	},
});