import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TouchableWithoutFeedback, Image, Alert } from 'react-native';
import firebase from 'firebase';
import MapView from 'react-native-maps';
import { FontAwesome } from '@expo/vector-icons';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadGym, renderStars, dateToString, joinGroupSession, loadUser } from '../components/Functions';
const markerImg = require('../images/marker.png');
const profileImg = require('../images/profile.png');
const loading = require('../images/loading.gif');

export class GymModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			page: 'trainers'
		};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if(!this.state.gym) {
			try {
				const gym = await loadGym(this.props.gymKey);
				const user = await loadUser(firebase.auth().currentUser.uid);
				this.loadImages(gym);
				this.setState({ gym, user });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading this gym. Please try again later.');
				this.props.hide();
			}
		}
	}

	// Loads trainer images from firesbase
	loadImages = (gym) => {
		if(!gym.trainers) {
			return;
		}
		Object.keys(gym.trainers).map(async(key) => {
			try {
				const url = await firebase.storage().ref().child(key).getDownloadURL();
				gym.trainers[key].uri = url;
				this.setState({ gym });
			} catch(error) {
				gym.trainers[key].uri = null;
				this.setState({ gym });
			}
		});
	}

	// Deselects or selects trainer based on trainer clicked
	setTrainer = (trainer) => {
		if (this.state.trainer == trainer) {
				return null;
		}
		return trainer;
	}

	// Deselects or selects group session based on session clicked
	setSession = (session) => {
		if (this.state.session === session) {
			return null;
		}
		return session;
	}

	joinGroupSession = async(session) => {
		try {
			const userId = firebase.auth().currentUser.uid;
			if (session.clientCount >= session.capacity) {
				Alert.alert('This session is already full.');
				return;
			}

			if (session.clients && session.clients[userId]) {
				Alert.alert('You have already joined this session.');
				return;
			}

			if (!this.state.user.cardAdded) {
				Alert.alert('You must have a card entered before you can join a group session.');
				return;
			}

			if (userId === session.trainer) {
				Alert.alert('You cannot join you own group session.');
				return;
			}

			if (session.started) {
				Alert.alert('You cannot join a session after it has started.');
				return;
			}

			await joinGroupSession(session, this.state.user, userId);
			const gym = await loadGym(this.props.gymKey);
			this.loadImages(gym);
			this.setState({ gym });
			Alert.alert('You have successfully joined the session. You can leave this session before it starts on the calendar page.');
		} catch(error) {
			Alert.alert('There was an error when trying to join the group session. Please try again later');
		}
	}

	//Returns list of group sessions in a view
	renderSessions = () => {
		if (!this.state.gym.groupSessions) {
			return;
		}

		const sessions = [];
		Object.keys(this.state.gym.groupSessions).map((key) => {
			const session = this.state.gym.groupSessions[key];
			session.key = key;
			sessions.push(session);
		});
		
		const sessionsList = sessions.map((session) => {
			const trainerImage = this.state.gym.trainers[session.trainer].uri;
			if (!trainerImage) {
				imageHolder = (<View style={styles.imageContainer}><Image source={profileImg} style={styles.imageHolder} /></View>);
			} else {
				imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: trainerImage }} style={styles.imageHolder} /></View>);
			}

			let infoArea;
			if (this.state.session === session.key) {
				infoArea = (
					<View style={styles.infoArea}>
						<Text style={[styles.info, {fontWeight: '700'}]}>{session.trainerName} - ${session.rate}/hr</Text>
						<Text style={styles.info}>{session.bio}</Text>
						<View style={styles.fullButtonRow}>
							<TouchableOpacity style={styles.fullButtonContainer} onPress={() => this.joinGroupSession(session)}>
								<Text style={styles.buttonText}>Join Session!</Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			} else {
				infoArea = null;
			}

			//DOM Element for a trainer in gym modal
			return(
				<TouchableWithoutFeedback key={session.key} onPress={() => {this.setState({session: this.setSession(session.key)})}}>
					<View style={styles.trainerContainer}>
							<View style={styles.trainerRow}>
								{imageHolder}
								<View style={styles.trainerInfoContainer}>
										<Text style={styles.trainerName}>{session.name}</Text>
										<Text style={styles.info}>{session.clientCount} / {session.capacity} clients</Text>
										<Text style={styles.info}>{dateToString(session.start)}</Text>
										<Text style={styles.info}>{session.duration} min</Text>
								</View>
							</View>
							{infoArea}
					</View>
				</TouchableWithoutFeedback>
			);
		});
		return sessionsList;
	}

  //Returns list of trainers with corresponding view
	renderTrainers = () => {
		if (!this.state.gym.trainers) {
			return;
		}

		const trainers = [];
		Object.keys(this.state.gym.trainers).map((key) => {
			const trainer = this.state.gym.trainers[key];
			trainer.key = key;
			trainers.push(trainer);
		});

		trainers.sort(function(a,b) {
			if(a.active && b.active){
				return b.rating - a.rating;
			}else if(b.active){
				return 1;
			}else{
				return -1;
			}
		});

		const trainersList = trainers.map((trainer) => {
			//Get active status of trainer
			let activeField;
			if (trainer.active) {
				activeField = <Text style={[styles.rate, styles.active]}>Active - ${trainer.rate}/hr</Text>;
			} else {
				activeField = <Text style={[styles.rate, styles.away]}>Away - ${trainer.rate}/hr</Text>;
			}

			let imageHolder;
			if (!trainer.uri) {
				imageHolder = (<View style={styles.imageContainer}><Image source={profileImg} style={styles.imageHolder} /></View>);
			} else {
				imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: trainer.uri }} style={styles.imageHolder} /></View>);
			}

			let infoArea;
			if (this.state.trainer === trainer.key) {
				infoArea = (
					<View style={styles.infoArea}>
						<Text style={styles.info}>{trainer.bio}</Text>
						<Text style={styles.info}>Certs: {trainer.cert}</Text>
						<View style={styles.buttonRow}>
							<TouchableOpacity style={styles.buttonContainer} onPress={() => {this.props.setTrainer(trainer)}}>
								<Text style={styles.buttonText}>Book Now!</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.buttonContainer} onPress={() => {this.props.viewSchedule(trainer)}}>
								<Text style={styles.buttonText}>Schedule</Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			} else {
				infoArea = null;
			}

			//DOM Element for a trainer in gym modal
			return(
				<TouchableWithoutFeedback key={trainer.key} onPress={() => {this.setState({trainer: this.setTrainer(trainer.key)})}}>
					<View style={styles.trainerContainer}>
							<View style={styles.trainerRow}>
								{imageHolder}
								<View style={styles.trainerInfoContainer}>
										<Text style={styles.trainerName}>{trainer.name}</Text>
										<View style={styles.ratingContainer}>
											<Text style={styles.icon}>{renderStars(trainer.rating)}</Text>
											{activeField}
										</View>
								</View>
							</View>
							{infoArea}
					</View>
				</TouchableWithoutFeedback>
			);
		});
		return trainersList;
	}

	//Loads map object
	loadMap = () => {
		return (
			<MapView
				style={styles.map}
				region={{
					latitude: this.state.gym.location.latitude,
					longitude: this.state.gym.location.longitude,
					latitudeDelta: 0.0422,
					longitudeDelta: 0.0221
				}}
				pitchEnabled = {false} rotateEnabled = {false} scrollEnabled = {false} zoomEnabled = {false}>
				<MapView.Marker
					key={this.state.gym.key}
					coordinate={this.state.gym.location}
				>
					<Image source={markerImg} style={{width: 50, height: 50}} />
				</MapView.Marker>
			</MapView>
		);
	}

	render(){
		if (!this.state.gym) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		var content = (this.state.page === 'trainers') ? this.renderTrainers() : this.renderSessions();
		var trainerButtonStyle = (this.state.page === 'trainers') ? styles.toggledButton : null;
		var sessionButtonStyle = (this.state.page === 'trainers') ? null : styles.toggledButton;
		return(
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.gymName}>{this.state.gym.name}</Text>
					<Text style={styles.hourDetails}>{this.state.gym.hours}</Text>
					<View style={[styles.buttonRow, {marginTop: 0}]}>
						<TouchableOpacity style={[styles.menuTab, trainerButtonStyle]} onPress={() => this.setState({ page: 'trainers' })}>
							<Text style={styles.hourDetails}>Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.menuTab, sessionButtonStyle]} onPress={() => this.setState({ page: 'sessions' })}>
							<Text style={styles.hourDetails}>Sessions</Text>
						</TouchableOpacity>
					</View>
					<Text style={styles.closeButton} onPress={this.props.hide}>
						<FontAwesome name="close" size={35} />
					</Text>
				</View>
				<View style={styles.mapContainer}>
					{this.loadMap()}
				</View>
				<View style={styles.trainersContainer}>
					<ScrollView showsVerticalScrollIndicator={false}>
						{content}
					</ScrollView>
				</View>
			</View>
		)
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .95,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	gymName: {
		fontSize: 30,
		color: COLORS.WHITE,
		fontWeight: '500',
		textAlign: 'center'
	},
	nameContainer: {
		height: '25%',
		width: '100%',
		paddingTop: 20,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	mapContainer: {
		height: '20%',
		width: '100%'
	},
	map: {
		height: '100%',
		width: '100%'
	},
	trainersContainer: {
		height: '55%',
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'center',
		paddingLeft: 22
	},
	trainerContainer: {
		backgroundColor: COLORS.WHITE,
		width: '95%',
		minHeight: 100,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		marginTop: 10
	},
	trainerRow: {
		width: '90%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10,
	},
	ratingRow: {
		width: '90%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10
	},
	infoArea: {
		width: '95%',
	},
	info: {
		fontSize: 16,
		fontWeight: '500',
		color: COLORS.PRIMARY,
		margin: 5
	},
	buttonRow: {
		width: '100%',
		flexDirection: 'row', 
		justifyContent: 'space-between',
	},
	fullButtonRow: {
		width: '100%',
		flexDirection: 'row', 
		justifyContent: 'center',
		marginTop: 10
	},
  imageContainer: {
		width: 90,
		height:90,
		borderRadius: 5,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 90,
		height: 90,
		borderRadius: 5
	},
	trainerInfoContainer:{
		width: '60%',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		minHeight: 100,
	},
	ratingContainer: {
		height: 50,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	trainerName: {
		textAlign: 'center',
		fontSize: 22,
		fontWeight: '600',
		color: COLORS.PRIMARY
	},
	closeButton: {
		position: 'absolute',
		top: 0,
		right: 0,
		fontSize: 35,
		color: COLORS.RED,
	},
	rate: {
		fontSize: 16,
		fontWeight: '500',
		color: COLORS.WHITE
	},
	hourDetails: {
		fontSize: 20,
		color: COLORS.WHITE,
		fontWeight: '400',
		marginTop: 5,
	},
	toggledButton: {
		backgroundColor: COLORS.SECONDARY
	},
	menuTab: {
		width: '50%',
		padding: 5,
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		textAlign: 'center'
	},
	buttonContainer: {
		width: '40%',
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		margin: 10,
		borderRadius: 5
	},
	fullButtonContainer: {
		width: '80%',
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		margin: 10,
		borderRadius: 5
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	active:{
		color: COLORS.SECONDARY
	},
	away:{
		color: COLORS.PRIMARY
	},
	icon: {
		color: COLORS.SECONDARY,
		fontSize: 15,
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
  }
});