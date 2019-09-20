import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import * as Font from 'expo-font';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { BookModalTrainer } from '../modals/BookModalTrainer';
import COLORS from '../components/Colors';

export class ClientPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			user: 'null',
			trainees: 'null',
			requests: 'null',
			incomingRequests: 'null',
			currentTab: 'recent',
		}
		this.loadRecent=this.loadRecent.bind(this);
		this.renderRecent=this.renderRecent.bind(this);
		this.getDate=this.getDate.bind(this);
		this.loadRequests=this.loadRequests.bind(this);
		this.renderRequests=this.renderRequests.bind(this);
		this.denyRequest=this.denyRequest.bind(this);
		this.acceptRequest=this.acceptRequest.bind(this);
		this.renderClients=this.renderClients.bind(this);
		this.hidebookModal=this.hidebookModal.bind(this);
		this.bookSession=this.bookSession.bind(this);
	}

	async componentDidMount() {
		await Font.loadAsync({
		  fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		//Get user info for state
		var recentTrainees = await this.loadRecent();
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
	    	this.setState({user: user, trainees: recentTrainees, requests: requests, incomingRequests: incomingRequests});
	    }.bind(this));
	}

	async loadRecent(){
		var user = firebase.auth().currentUser;
		var trainees = [];
		var traineeMap = [];
    	var pastRef = firebase.database().ref('pastSessions/' + user.uid);
    	await pastRef.on('value', function(data) {
    		data.forEach(function(dbevent) {
        		var item = dbevent.val();
        		if(!traineeMap.includes(item.session.trainee)){
        			var trainee = {
        				name: item.session.traineeName,
        				key: item.session.trainee,
        				date: item.session.start,
        				gym: item.session.gym
        			}
        			traineeMap.push(item.session.trainee);
        			trainees.push(trainee);
        		}
      		});
    	});
		return trainees;
	}

	sendClientRequest(traineeId, trainerName, gymKey) {
		var user = firebase.auth().currentUser;
		firebase.database().ref('clientRequests').child(traineeId).push({
			status: 'pending',
			trainer: user.uid,
			trainerName: trainerName,
			gym: gymKey
		});
		var requests = this.state.requests;
		requests.push(traineeId);
		firebase.database().ref('users').child(user.uid).update({
			requests: requests
		});
		this.setState({requests: requests});
	}

	async loadRequests(){
		var requests = [];
		var user = firebase.auth().currentUser;
		var requestRef = firebase.database().ref('trainerRequests').child(user.uid);
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

	async denyRequest(requestKey, traineeId){
		var user = firebase.auth().currentUser;

		//Grab all requests from clientRequests table except current one
		firebase.database().ref('trainerRequests').child(user.uid).child(requestKey).remove();
		var requests = [];
		await firebase.database().ref('users').child(traineeId).child('requests').on('child_added', function(snapshot){
			if(snapshot.val() != user.uid){
				requests.push(snapshot.val());
			}
		});
		firebase.database().ref('users').child(traineeId).update({requests: requests});
		
		//refresh incomingRequests for state change
		var incomingRequests = await this.loadRequests();
		this.setState({incomingRequests: incomingRequests});
	}

	async acceptRequest(requestKey, traineeId, traineeName){
		var user = firebase.auth().currentUser;

		//Get requests from clientRequests table and push all but accepted request to requests array
		firebase.database().ref('trainerRequests').child(user.uid).child(requestKey).remove();
		var requests = [];
		await firebase.database().ref('users').child(traineeId).child('requests').on('child_added', function(snapshot){
			if(snapshot.val() != user.uid){
				requests.push(snapshot.val());
			}
		});

		//Push new client to clients array in trainer user object in user tb
		var clientRef = firebase.database().ref('users').child(user.uid).child('clients');
		if(clientRef === undefined){
			var clients = [];
		}else{
			var clients = [];
			await clientRef.on('child_added', function(snapshot) {
				clients.push(snapshot.val());
			})
		}
		clients.push({
			traineeName: traineeName,
			trainee: traineeId
		})

		//Push new trainer to trainers array in trainee user object in user db
		var trainerRef = firebase.database().ref('users').child(traineeId).child('trainers');
		if(trainerRef === undefined){
			var trainers = [];
		}else{
			var trainers = [];
			await trainerRef.on('child_added', function(snapshot) {
				trainers.push(snapshot.val());
			})
		}
		trainers.push({
			trainerName: this.state.user.name,
			trainer: user.uid,
			gym: this.state.user.gym
		})

		//Push changes to clients and trainers arrays to user db
		firebase.database().ref('users').child(traineeId).update({trainers: trainers, requests: requests});
		firebase.database().ref('users').child(user.uid).update({clients: clients});

		//Refresh incoming requests for state change
		var incomingRequests = await this.loadRequests();
		await firebase.database().ref('users').orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	var user = snapshot.val();
	    	this.setState({incomingRequests: incomingRequests, user: user});
	    }.bind(this));
	}

	hidebookModal(){
		this.setState({bookModal: false});
	}

	renderRequests(){
		var result = this.state.incomingRequests.map(function(request){
			return(
				<View key={request.trainee} style={styles.traineeRow}>
					<Text style={{width:120}}>{request.traineeName}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyRequest(request.key, request.trainee)}> 
						<Text><FontAwesome>{Icons.close}</FontAwesome> Deny</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.acceptRequest(request.key, request.trainee, request.traineeName)}> 
						<Text><FontAwesome>{Icons.check}</FontAwesome> Accept</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderClients() {
		if(this.state.user.clients === undefined){
			return;
		}
		var result = this.state.user.clients.map(function(trainer){
			return(
				<View key={trainer.trainee} style={styles.traineeRow}>
					<Text style={{width:120}}>{trainer.traineeName}</Text>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(trainer.trainee, this.state.user.gym)}> 
						<Text><FontAwesome>{Icons.calendar}</FontAwesome> Book Session</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderRecent() {
		var result = this.state.trainees.map(function(trainee){
			if(this.state.incomingRequests.filter(request => (request.trainee == trainee.key)).length > 0){
				return;
			}
			if(this.state.user.clients !== undefined && this.state.user.clients.filter(request => (request.trainee == trainee.key)).length > 0){
				return;
			}
			var button;
			if(this.state.requests.includes(trainee.key)){
				button = (
					<TouchableOpacity style={styles.requestButton} disabled={true}> 
						<Text><FontAwesome>{Icons.hourglass}</FontAwesome> Pending</Text>
					</TouchableOpacity>
				);
			}else{
				button = (
					<TouchableOpacity style={styles.requestButton} onPress={() => this.sendClientRequest(trainee.key, this.state.user.name, this.state.user.gym)}> 
						<Text><FontAwesome>{Icons.userPlus}</FontAwesome> Add Client</Text>
					</TouchableOpacity>
				);
			}
			return(
				<View key={trainee.key} style={styles.traineeRow}>
					<Text style={{width:120}}>{trainee.name}</Text>
					<Text style={{width:50}}>{this.getDate(trainee.date)}</Text>
					{button}
				</View>
			);
		}.bind(this));
		return result;
	}

	bookSession(client, trainerGym){
		console.log(client);
		console.log(trainerGym);
		this.setState({bookingClient: client, selectedGym: trainerGym, bookModal: true});
	}

	goToMap(){
		Actions.MapPage();
	}


	render() {
		if(this.state.user == 'null' || this.state.trainees == 'null' || this.state.requests == 'null' || this.state.incomingRequests == 'null'){
			return <AppLoading />
		}else{
			if(this.state.currentTab == 'requests'){
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'requests'})}>
							<Text style={styles.activeText}>Client Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.navText}>Recent Trainees</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'clients'})}>
							<Text style={styles.navText}>Your Clients</Text>
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
							<Text style={styles.navText}>Client Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.activeText}>Recent Trainees</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'clients'})}>
							<Text style={styles.navText}>Your Clients</Text>
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
							<Text style={styles.navText}>Client Requests</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
							<Text style={styles.navText}>Recent Trainees</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'clients'})}>
							<Text style={styles.activeText}>Your Clients</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderClients()}
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
            				<BookModalTrainer client={this.state.bookingClient} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')}/>
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
