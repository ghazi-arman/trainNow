import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
import { getLocation, loadSession, dateToString, startSession } from '../components/Functions';

export class SessionPage extends Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		this._interval = setInterval(async () => {
			try {
				const location = await getLocation();
				const session = await loadSession(this.props.session);
				if (session.end) {
					clearInterval(this._interval);
					Actions.RatingPage({session: session.key});
				}
				this.setState({ session, userRegion: location, mapRegion: location });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error when trying to load the current session.');
				this.goToMap();
			}
		}, 1000);
	}

	componentWillUnmount() {
		clearInterval(this._interval);
	}
	
	startSession = () => {
		startSession(this.state.session, this.state.userRegion);
	}
	
	endSession = () => {
		const user = firebase.auth().currentUser;
		const sessionRef = firebase.database().ref(`/trainSessions/${this.state.session.key}`);
		
		if(this.state.session.trainer == user.uid){
			if(this.state.session.traineeEnd){
				sessionRef.update({trainerEnd: true, end: new Date()});
				Actions.RatingPage({session: this.state.session.key});
			}else{
				sessionRef.update({trainerEnd: true});
			}
		}else{
			if(this.state.session.trainerEnd){
				sessionRef.update({traineeEnd: true, end: new Date()});
				Actions.RatingPage({session: this.state.session.key});
			}else{
				sessionRef.update({traineeEnd: true});
			}
		}
	}

	goToMap = () => Actions.reset('MapPage');

	render() {
		if (!this.state.session || !this.state.userRegion) {
			return <AppLoading />
		}

		var displayDate = dateToString(this.state.session.start);

		var map, button, time, minutes, remaining, ready, ownReady, ownEnd;
		var user = firebase.auth().currentUser;
		if(this.state.session.trainee == user.uid){
			description = <Text style={styles.bookDetails}>{this.state.session.trainerName} is training you!</Text>;
		}else{
			description = <Text style={styles.bookDetails}>You are training {this.state.session.traineeName}!</Text>;
		}
		if(!this.state.session.met){
			time = <Text style={styles.bookDetails}>{displayDate} </Text>;
			length = <Text style={styles.bookDetails}>{this.state.session.duration} min</Text>;
			map = ( 
				<MapView
					pitchEnabled = {false}
					rotateEnabled = {false}
					scrollEnabled = {false}
					zoomEnabled = {false}
					style={styles.mapContainer}
					region={this.state.mapRegion}
					showsUserLocation={true}
				>
					<MapView.Marker
							ref={this.state.session.trainer}
							key={this.state.session.trainer}
							coordinate={this.state.session.location}
					/>
				</MapView>);
			button = (
				<TouchableOpacity 
					style={styles.buttonContainer}
					onPressIn={this.startSession}>
					<Text style={styles.buttonText}> Start Session </Text>
				</TouchableOpacity>
			);

			//Gives info about whether trainer/trainee is ready or en route
			if(this.state.session.traineeReady && user.uid == this.state.session.trainer){
				ready = <Text style={styles.smallText}>{this.state.session.traineeName} is ready!</Text>;
			}else if(this.state.session.trainerReady && user.uid == this.state.session.trainee){
				ready = <Text style={styles.smallText}>{this.state.session.trainerName} is ready!</Text>
			}else if(user.uid == this.state.session.trainee){
				ready = <Text style={styles.smallText}>{this.state.session.trainerName} is en route!</Text>;					
			}else{
				ready = <Text style={styles.smallText}>{this.state.session.traineeName} is en route</Text>;
			}

			//Gives info about if user is ready or not
			if(this.state.session.traineeReady && user.uid == this.state.session.trainee){
				ownReady = <Text style={styles.smallText}>You are ready!</Text>;
			}else if(this.state.session.trainerReady && user.uid == this.state.session.trainer){
				ownReady = <Text style={styles.smallText}>You are ready!</Text>;
			}

		}else{
			pendingDate = new Date(this.state.session.start);
			displayDate = dateToString(this.state.session.start);
			remaining = ((pendingDate.getTime() + (parseInt(this.state.session.duration) * 1000 * 60)) - new Date().getTime());
			minutes = Math.max(Math.floor((remaining/1000)/60), 0);
			time = <Text style={styles.bookDetails}>{displayDate}</Text>;
			length = <Text style={styles.bookDetails}>You have {minutes} min left</Text>;
			button = (
				<TouchableOpacity 
					style={styles.buttonContainer}
					onPressIn={this.endSession}>
					<Text 
						style={styles.buttonText}
						>End Session</Text>
				</TouchableOpacity>
			);
			map = null;

			//Gives info about whether trainer/trainee is ready or en route
			if(this.state.session.traineeEnd && user.uid === this.state.session.trainer){
				ready = <Text style={styles.smallText}>{this.state.session.traineeName} has ended!</Text>;
			}else if(this.state.session.trainerEnd && user.uid == this.state.session.trainee){
				ready = <Text style={styles.smallText}>{this.state.session.trainerName} has ended!</Text>
			}

			if(this.state.session.traineeEnd && user.uid === this.state.session.trainee){
				ownEnd = <Text style={styles.smallText}>Waiting for {this.state.session.trainerName} to end!</Text>;
			}else if(this.state.session.trainerEnd && user.uid == this.state.session.trainer){
				ownEnd = <Text style={styles.smallText}>Waiting for {this.state.session.traineeName} to end!</Text>;
			}
		}
		return (
			<View style={styles.container}>
				<View style={styles.nameContainer}>
					<Text style={styles.backButton} onPress={this.goToMap}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
					</Text>
					<Text style={styles.header}>Your Session</Text>
				</View>
				<View style={styles.formContainer}>
					<View style={styles.infoContainer}>
						{description}
						{time}
						{length}
						{ready}
					</View>
					{map}
					<View style={styles.buttonContain}>
						{button}
						{ownReady}
						{ownEnd}
					</View>
				</View>
			</View>	
		);
	}
}

const styles = StyleSheet.create({
	bookDetails:{
		fontSize: 18,
		fontWeight: '500',
		color: COLORS.PRIMARY
  },
	smallText:{
		marginTop: 5,
		fontSize: 15,
		fontWeight: '300',
		color: COLORS.SECONDARY,
		textAlign: 'center'
	},
	header: {
		fontSize: 30,
		fontWeight: '700',
		color: COLORS.PRIMARY
	},
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	nameContainer: {
		flex: 1,
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	formContainer: {
		flex: 6,
		width: '95%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	mapContainer: {
		width: '90%',
		height: '35%'
	},
	buttonContain: {
		width: '50%',
		height: '20%',
		marginTop: 10,
	},
	infoContainer: {
		height: '35%',
		width: '80%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},	
	buttonContainer: {
		borderRadius: 5,
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: '100%',
		paddingTop: 15,
		flexDirection: 'row',
		justifyContent: 'center'
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	backButton: {
		position: 'absolute',
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
	}
});