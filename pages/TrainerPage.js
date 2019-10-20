import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import { BookModalRegular } from '../modals/BookModalRegular';
import COLORS from '../components/Colors';
import { loadUser, loadRecentTrainers, loadClientRequests, dateToString, acceptClientRequest, sendTrainerRequest, denyClientRequest } from '../components/Functions';

export class TrainerPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			currentTab: 'recent',
			bookModal: false
		}
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if (!this.state.user || !this.state.recentTrainers || !this.state.clientRequests) {
			try {
				const userId = firebase.auth().currentUser.uid;
				const user = await loadUser(userId);
				const recentTrainers = await loadRecentTrainers(userId);
				const clientRequests = await loadClientRequests(userId);
				this.setState({ user, recentTrainers, clientRequests });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the trainer page. Please try again later.');
				this.goToMap();
			}
		}
	}

	sendTrainerRequest = async (trainerKey, traineeName, gymKey) => {
		try {
			const userId = firebase.auth().currentUser.uid;
			await sendTrainerRequest(trainerKey, traineeName, userId, gymKey);
			Alert.alert(`Request was sent to the trainer.`);
			const user = await loadUser(userId);
			this.setState({ user });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error sending the request.');
		}
	}

	denyRequest = async(requestKey, trainerKey) => {
		try {
			const userId = firebase.auth().currentUser.uid;
			await denyClientRequest(requestKey, userId, trainerKey);
			const clientRequests = await loadClientRequests(userId);
			this.setState({ clientRequests });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error denying the request.');
		}
	}

	acceptRequest = async(requestKey, trainerKey, trainerName, gymKey) => {
		try {
			await acceptClientRequest(requestKey, trainerKey, trainerName, firebase.auth().currentUser.uid, this.state.user.name, gymKey);
			const clientRequests = await loadClientRequests(firebase.auth().currentUser.uid);
			const user = await loadUser(firebase.auth().currentUser.uid);
			this.setState({ clientRequests, user });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error accepting the request.');
		}
	}

	bookSession = (trainer, trainerGym) => {
		this.setState({bookingTrainer: trainer, selectedGym: trainerGym, bookModal: true});
	}

	hidebookModal = () => {
		this.setState({bookModal: false});
	}

	renderRequests = () => {
		return this.state.clientRequests.map((request) => {
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
		});
	}

	renderTrainers = () => {
		if(!this.state.user.trainers){
			return;
		}
		return Object.keys(this.state.user.trainers).map((key) => {
			const trainer = this.state.user.trainers[key];
			return(
				<View key={trainer.trainer} style={styles.traineeRow}>
					<Text style={{width: 120}}>{trainer.trainerName}</Text>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(trainer.trainer, trainer.gym)}> 
						<Text><FontAwesome>{Icons.calendar}</FontAwesome> Book Session</Text>
					</TouchableOpacity>
				</View>
			);
		});
	}

	renderRecent = () => {
		return this.state.recentTrainers.map((trainer) => {
			if(this.state.clientRequests.filter(request => (request.trainer == trainer.key)).length > 0 ||
				(this.state.user.trainers && this.state.user.trainers[trainer.key])){
				return;
			}

			let button;
			if(this.state.user.requests && this.state.user.requests[trainer.key]){
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
					<Text style={{width: '60%', textAlign: 'center'}}>{trainer.name}</Text>
					{button}
				</View>
			);
		});
	}

	goToMap = () => {
		Actions.MapPage();
	}

	render() {
		if (!this.state.user || !this.state.clientRequests || !this.state.recentTrainers) {
			return <AppLoading />
		}
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
						<BookModalRegular trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')}/>
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
  navigationBar: {
		width: '100%',
		height: 100,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 5,
	},
	nameContainer: {
	  height: '10%',
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end'
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
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY,
		paddingBottom: 5
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