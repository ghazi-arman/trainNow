import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import { BookModalTrainer } from '../modals/BookModalTrainer';
import COLORS from '../components/Colors';
import { loadRecentClients, loadUser, sendClientRequest, dateToString, denyClientRequest, loadTrainerRequests, acceptTrainerRequest } from '../components/Functions';

export class ClientPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			bookModal: false,
			currentTab: 'recent'
		}
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if(!this.state.user || !this.state.recentClients || !this.state.trainerRequests) {
			try {
				const userId = firebase.auth().currentUser.uid;
				const recentClients = await loadRecentClients(userId);
				const trainerRequests = await loadTrainerRequests(userId);
				const user = await loadUser(userId);
				this.setState({ recentClients, trainerRequests, user });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the client page. Please try again later');
				this.goToMap();
			}
		}
	}

	sendClientRequest = async (clientKey) => {
		try {
			const userId = firebase.auth().currentUser.uid;
			await sendClientRequest(clientKey, userId, this.state.user.name, this.state.user.gym);
			const trainerRequests = await loadTrainerRequests(firebase.auth().currentUser.uid);
			const user = await loadUser(firebase.auth().currentUser.uid);
			Alert.alert(`Request was sent to client.`);
			this.setState({ trainerRequests, user });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error sending the client a request.');
		}
	}

	denyRequest = async(requestKey, traineeKey) => {
		try {
			await denyClientRequest(requestKey, traineeKey, firebase.auth().currentUser.uid);
			const trainerRequests = loadTrainerRequests(firebase.auth().currentUser.uid);
			this.setState({ trainerRequests });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error denying that request.');
		}
	}

	acceptRequest = async(requestKey, traineeKey, traineeName) => {
		try {
			const userId = firebase.auth().currentUser.uid;
			await acceptTrainerRequest(requestKey, userId, this.state.user.name, traineeKey, traineeName, this.state.user.gym);
			const trainerRequests = await loadTrainerRequests(firebase.auth().currentUser.uid);
			const user = await loadUser(firebase.auth().currentUser.uid);
			this.setState({ trainerRequests, user });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error accepting that request.');
		}
	}

	hidebookModal = () => {
		this.setState({ bookModal: false });
	}

	renderRequests = () => {
		if(!this.state.trainerRequests || !Array.isArray(this.state.trainerRequests)) {
			return;
		}
		return this.state.trainerRequests.map((request) => {
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
		});
	}

	renderClients = () => {
		if(!this.state.user.clients){
			return;
		}
		return Object.keys(this.state.user.clients).map((key) => {
			const client = this.state.user.clients[key];
			return(
				<View key={client.trainee} style={styles.traineeRow}>
					<Text style={{width:120}}>{client.traineeName}</Text>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(client.trainee, this.state.user.gym)}> 
						<Text><FontAwesome>{Icons.calendar}</FontAwesome> Book Session</Text>
					</TouchableOpacity>
				</View>
			);
		});
	}

	renderRecent = () => {
		return this.state.recentClients.map((trainee) => {
			// if this client currently has requested the trainer or is already a regular client
			if (Array.isArray(this.state.trainerRequests) && this.state.trainerRequests.filter(request => (request.trainee == trainee.key)).length > 0 ||
				(this.state.user.clients && this.state.user.clients[trainee.key])) {
				return;
			}

			let button;
			if(this.state.user.requests && this.state.user.requests[trainee.key]){
				button = (
					<TouchableOpacity style={styles.requestButton} disabled> 
						<Text><FontAwesome>{Icons.hourglass}</FontAwesome> Pending</Text>
					</TouchableOpacity>
				);
			}else{
				button = (
					<TouchableOpacity style={styles.requestButton} onPress={() => this.sendClientRequest(trainee.key)}>
						<Text><FontAwesome>{Icons.userPlus}</FontAwesome> Add Client</Text>
					</TouchableOpacity>
				);
			}
			return(
				<View key={trainee.key} style={styles.traineeRow}>
					<Text style={{width:120}}>{trainee.name}</Text>
					<Text style={{width:50}}>{dateToString(trainee.date)}</Text>
					{button}
				</View>
			);
		});
	}

	bookSession = (client, trainerGym) => {
		this.setState({ bookingClient: client, selectedGym: trainerGym, bookModal: true });
	}

	goToMap = () => {
		Actions.MapPage();
	}

	render() {
		if (!this.state.user || !this.state.trainerRequests || !this.state.recentClients) {
			return <AppLoading />
		}
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
