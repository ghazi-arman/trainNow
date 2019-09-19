import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Font } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { BookModalRegular } from '../modals/BookModalRegular';
import COLORS from '../components/Colors';

export class TrainerPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			user: 'null',
			trainers: 'null',
			requests: 'null',
			incomingRequests: 'null',
			bookModal: false
		}
		this.loadRecent=this.loadRecent.bind(this);
		this.renderRecent=this.renderRecent.bind(this);
		this.getDate=this.getDate.bind(this);
		this.loadRequests=this.loadRequests.bind(this);
		this.renderRequests=this.renderRequests.bind(this);
		this.denyRequest=this.denyRequest.bind(this);
		this.acceptRequest=this.acceptRequest.bind(this);
		this.renderTrainers=this.renderTrainers.bind(this);
		this.bookSession=this.bookSession.bind(this);
		this.hidebookModal=this.hidebookModal.bind(this);
	}

	async componentDidMount() {
		await Font.loadAsync({
		  fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		//Get user info for state
		var recentTrainers = await this.loadRecent();
		var incomingRequests = await this.loadRequests();
	    var user = firebase.auth().currentUser;
	    var usersRef = await firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', async function(snapshot) {
	    	var user = snapshot.val();
	    	if(user.requests === undefined){
	    		var requests = [];
	    	}else{
	    		var requests = user.requests;
	    	}
	    	this.setState({user: user, trainers: recentTrainers, requests: requests, incomingRequests: incomingRequests});
	    }.bind(this));
	}

	async loadRecent(){
		var user = firebase.auth().currentUser;
		var trainers = [];
		var trainerMap = [];
    	var pastRef = firebase.database().ref('pastSessions/' + user.uid);
    	await pastRef.on('value', function(data) {
    		data.forEach(function(dbevent) {
        		var item = dbevent.val();
        		if(!trainerMap.includes(item.session.trainer)){
        			var trainer = {
        				name: item.session.trainerName,
        				key: item.session.trainer,
        				date: item.session.start,
        				gym: item.session.gym
        			}
        			trainerMap.push(item.session.trainer);
        			trainers.push(trainer);
        		}
      		});
    	});
		return trainers;
	}

	sendTrainerRequest(trainerId, traineeName, gymKey) {
		var user = firebase.auth().currentUser;
		firebase.database().ref('trainerRequests').child(trainerId).push({
			status: 'pending',
			trainee: user.uid,
			traineeName: traineeName,
			gym: gymKey
		});
		var requests = this.state.requests;
		requests.push(trainerId);
		firebase.database().ref('users').child(user.uid).update({
			requests: requests
		});
		this.setState({requests: requests});
	}

	async loadRequests(){
		var requests = [];
		var user = firebase.auth().currentUser;
		var requestRef = firebase.database().ref('clientRequests').child(user.uid);
		await requestRef.on('child_added', function(snapshot){
			var request = snapshot.val();
			request.key = snapshot.key;
			requests.push(request);
		});
		return requests;
	}

	getDate(dateString){
		var date = new Date(dateString);
		return (date.getMonth() + 1).toString() + " / " + date.getDate().toString();
	}

	async denyRequest(requestKey, trainerId){
		var user = firebase.auth().currentUser;

		//Grab all requests from clientRequests table except current one
		firebase.database().ref('clientRequests').child(user.uid).child(requestKey).remove();
		var requests = [];
		await firebase.database().ref('users').child(trainerId).child('requests').on('child_added', function(snapshot){
			if(snapshot.val() != user.uid){
				requests.push(snapshot.val());
			}
		});
		firebase.database().ref('users').child(trainerId).update({requests: requests});
		
		//refresh incomingRequests for state change
		var incomingRequests = await this.loadRequests();
		this.setState({incomingRequests: incomingRequests});
	}

	async acceptRequest(requestKey, trainerId, trainerName, trainerGym){
		var user = firebase.auth().currentUser;

		//Get requests from clientRequests table and push all but accepted request to requests array
		firebase.database().ref('clientRequests').child(user.uid).child(requestKey).remove();
		var requests = [];
		await firebase.database().ref('users').child(trainerId).child('requests').on('child_added', function(snapshot){
			if(snapshot.val() != user.uid){
				requests.push(snapshot.val());
			}
		});

		//Push new client to clients array in trainer user object in user tb
		var clientRef = firebase.database().ref('users').child(trainerId).child('clients');
		if(clientRef === undefined){
			var clients = [];
		}else{
			var clients = [];
			await clientRef.on('child_added', function(snapshot) {
				clients.push(snapshot.val());
			})
		}
		clients.push({
			traineeName: this.state.user.name,
			trainee: user.uid
		})

		//Push new trainer to trainers array in trainee user object in user db
		var trainerRef = firebase.database().ref('users').child(user.uid).child('trainers');
		if(trainerRef === undefined){
			var trainers = [];
		}else{
			var trainers = [];
			await trainerRef.on('child_added', function(snapshot) {
				trainers.push(snapshot.val());
			})
		}
		trainers.push({
			trainerName: trainerName,
			trainer: trainerId,
			gym: trainerGym
		})

		//Push changes to clients and trainers arrays to user db
		firebase.database().ref('users').child(user.uid).update({trainers: trainers});
		firebase.database().ref('users').child(trainerId).update({requests: requests, clients: clients});

		//refresh incomingRequests for state change
		var incomingRequests = await this.loadRequests();
		await firebase.database().ref('users').orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	var user = snapshot.val();
	    	this.setState({incomingRequests: incomingRequests, user: user});
	    }.bind(this));
	}

	bookSession(trainer, trainerGym){
		this.setState({bookingTrainer: trainer, selectedGym: trainerGym, bookModal: true});
	}

	hidebookModal(){
		this.setState({bookModal: false});
	}

	renderRequests(){
		var result = this.state.incomingRequests.map(function(request){
			return(
				<View key={request.trainer} style={styles.traineeRow}>
					<Text style={{width: 120}}>{request.trainerName}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyRequest(request.key, request.trainer)}> 
						<Text><FontAwesome>{Icons.close}</FontAwesome> Deny</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.acceptRequest(request.key, request.trainer, request.trainerName, request.gym)}> 
						<Text><FontAwesome>{Icons.check}</FontAwesome> Accept</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderTrainers() {
		if(this.state.user.trainers === undefined){
			return;
		}
		var result = this.state.user.trainers.map(function(trainer){
			return(
				<View key={trainer.trainer} style={styles.traineeRow}>
					<Text style={{width: 120}}>{trainer.trainerName}</Text>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(trainer.trainer, trainer.gym)}> 
						<Text><FontAwesome>{Icons.calendar}</FontAwesome> Book Session</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderRecent() {
		var result = this.state.trainers.map(function(trainer){
			if(this.state.incomingRequests.filter(request => (request.trainer == trainer.key)).length > 0){
				return;
			}
			if(this.state.user.trainers !== undefined && this.state.user.trainers.filter(request => (request.trainer == trainer.key)).length > 0){
				return;
			}
			var button;
			if(this.state.requests.includes(trainer.key)){
				button = (
					<TouchableOpacity style={styles.requestButton} disabled={true}> 
						<Text><FontAwesome>{Icons.hourglass}</FontAwesome> Pending</Text>
					</TouchableOpacity>
				);
			}else{
				button = (
					<TouchableOpacity style={styles.requestButton} onPress={() => this.sendTrainerRequest(trainer.key, this.state.user.name, trainer.gym)}> 
						<Text><FontAwesome>{Icons.userPlus}</FontAwesome> Add Trainer</Text>
					</TouchableOpacity>
				);
			}
			return(
				<View key={trainer.key} style={styles.traineeRow}>
					<Text style={{width: 120}}>{trainer.name}</Text>
					<Text style={{width:50}}>{this.getDate(trainer.date)}</Text>
					{button}
				</View>
			);
		}.bind(this));
		return result;
	}

	goToMap(){
		Actions.MapPage();
	}


	render() {
		if(this.state.user == 'null' || this.state.trainees == 'null' || this.state.requests == 'null' || this.state.incomingRequests == 'null'){
			return <Expo.AppLoading />
		}else{
			if(this.state.currentTab == 'requests'){
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'requests'})}>
							<Text style={styles.activeText}>Trainer Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.navText}>Recent Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'trainers'})}>
							<Text style={styles.navText}>Your Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderRequests()}
	            	</ScrollView>
				);
			}else if(this.state.currentTab == 'recent'){
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'requests'})}>
							<Text style={styles.navText}>Trainer Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.activeText}>Recent Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'trainers'})}>
							<Text style={styles.navText}>Your Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderRecent()}
	            	</ScrollView>
				);
			}else{
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'requests'})}>
							<Text style={styles.navText}>Trainer Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.navText}>Recent Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'trainers'})}>
							<Text style={styles.activeText}>Your Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderTrainers()}
	            	</ScrollView>
				);
			}
			return (
				<View style = {styles.container}>
					<Text style={styles.backButton} onPress={this.goToMap}>
	              		<FontAwesome>{Icons.arrowLeft}</FontAwesome>
	            	</Text>
	            	<Text style={styles.title}>Trainers</Text>
					{navBar}
					{content}
					<Modal 
						isVisible={this.state.bookModal}
          				onBackdropPress={this.hidebookModal}>
            				<BookModalRegular trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')}/>
          			</Modal>
				</View>	
			);
		}
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
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
		width: '33%',
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	inactiveTab: {
		width: '33%',
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
  		justifyContent: 'space-around',
  		alignItems: 'center',
  		width: '90%',
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
		width: 100,
		height: 40,
	},
	denyButton: {
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 100,
		height: 40,
	},
	icon: {
		fontSize: 15
	},
});