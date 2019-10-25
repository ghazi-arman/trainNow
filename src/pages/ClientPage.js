import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import { BookModalTrainer } from '../modals/BookModalTrainer';
import COLORS from '../components/Colors';
import { loadRecentClients, loadUser, sendClientRequest, dateToString, loadTrainerRequests, acceptTrainerRequest, denyTrainerRequest } from '../components/Functions';
const loading = require('../images/loading.gif');

export class ClientPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			bookModal: false,
			currentTab: 'recent',
			pressed: false
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
		if (this.state.pressed) {
			return;
		}
		try {
			this.state.pressed = true;
			const userId = firebase.auth().currentUser.uid;
			await sendClientRequest(clientKey, userId, this.state.user.name, this.state.user.gym);
			Alert.alert(`Request was sent to the client.`);
			const user = await loadUser(firebase.auth().currentUser.uid);
			this.setState({ user, pressed: false });
		} catch(error) {
			this.state.pressed = false;
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error sending the client a request.');
		}
	}

	denyRequest = async(requestKey, traineeKey) => {
		try {
			await denyTrainerRequest(requestKey, traineeKey, firebase.auth().currentUser.uid);
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
					<Text style={styles.nameText}>{request.traineeName}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyRequest(request.key, request.trainee)}> 
						<Text style={styles.buttonText}><FontAwesome>{Icons.close}</FontAwesome></Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.acceptButton} onPress={() => this.acceptRequest(request.key, request.trainee, request.traineeName)}> 
						<Text style={styles.buttonText}><FontAwesome>{Icons.check}</FontAwesome></Text>
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
					<Text style={styles.nameText}>{client.traineeName}</Text>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(client.trainee, this.state.user.gym)}> 
						<Text style={styles.buttonText}><FontAwesome>{Icons.calendar}</FontAwesome> Book</Text>
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
						<Text style={styles.buttonText}><FontAwesome>{Icons.hourglass}</FontAwesome> Pending</Text>
					</TouchableOpacity>
				);
			}else{
				button = (
					<TouchableOpacity style={styles.requestButton} onPress={() => this.sendClientRequest(trainee.key)}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.userPlus}</FontAwesome> Add </Text>
					</TouchableOpacity>
				);
			}
			return(
				<View key={trainee.key} style={styles.traineeRow}>
					<Text style={styles.nameText}>{trainee.name}</Text>
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
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		if(this.state.currentTab == 'requests'){
			var navBar = (
				<View style={styles.navigationBar}>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'requests'})}>
						<Text style={styles.activeText}>Requests</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
						<Text style={styles.navText}>Recent</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'clients'})}>
						<Text style={styles.navText}>Clients</Text>
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
						<Text style={styles.navText}>Requests</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'recent'})}>
						<Text style={styles.activeText}>Recent</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'clients'})}>
						<Text style={styles.navText}>Clients</Text>
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
						<Text style={styles.navText}>Requests</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
						<Text style={styles.navText}>Recent</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'clients'})}>
						<Text style={styles.activeText}>Clients</Text>
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
				<View style={styles.nameContainer}>
					<Text style={styles.backButton} onPress={this.goToMap}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
					</Text>
					<Text style={styles.title}>Trainers</Text>
				</View>
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
		fontSize: 34,
		color: COLORS.PRIMARY,
		fontWeight: '700',
	},
	nameContainer: {
		height: '10%',
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end'
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
		paddingVertical: 20,
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	inactiveTab: {
		width: '33%',
		paddingVertical: 20,
		backgroundColor: COLORS.WHITE,
		borderWidth: 1, 
		borderColor: COLORS.SECONDARY
	},
	navText: {
		fontSize: 23,
		fontWeight: '600',
		color: COLORS.PRIMARY,
		textAlign: 'center'
	},
	activeText: {
		fontSize: 23,
		fontWeight: '600',
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
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
		paddingBottom: 5
	},
	buttonText: {
		fontSize: 18,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
	requestButton: {
		borderRadius: 5,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 100,
		height: 40,
	},
	denyButton: {
		borderRadius: 5,
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 40,
		height: 40,
	},
	acceptButton: {
		borderRadius: 5,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 40,
		height: 40,
	},
	icon: {
		fontSize: 15
	},
	loading: {
    width: '100%',
    resizeMode: 'contain'
	},
	loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
	},
	nameText: {
		fontSize: 18,
		fontWeight: '500',
		width: '50%',
		textAlign: 'center',
		color: COLORS.PRIMARY
	}
});
