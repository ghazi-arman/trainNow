import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import Modal from 'react-native-modal';
import bugsnag from '@bugsnag/expo';
import { dateToString, timeOverlapCheck, loadUser, loadAcceptedSessions, loadPendingSessions, loadAcceptedSchedule, createSession, sendMessage, cancelPendingSession, cancelAcceptedSession, markSessionsAsRead } from '../components/Functions';
import COLORS from '../components/Colors';
import { SchedulerModal } from '../modals/SchedulerModal';
import { TrainerSchedule } from '../components/TrainerSchedule';

export class SchedulePage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			scheduleModal: false,
			trainerSchedule: false,
			currentTab: 'pending',
		}
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if (!this.state.user || !this.state.pendingSessions || !this.state.acceptSessions) {
			try {
				const userId = firebase.auth().currentUser.uid;
				const user = await loadUser(userId);
				const userType = (user.trainer ? 'trainer' : 'trainee')
				const pendingSessions = await loadPendingSessions(userId, userType);
				const acceptSessions = await loadAcceptedSessions(userId, userType);
				await markSessionsAsRead(pendingSessions, acceptSessions, user.trainer);
				this.setState({ user, pendingSessions, acceptSessions });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was as an error loading the schedule page.');
				Actions.reset('MapPage');
			}
		}
	}

	acceptSession = async(session) => {
		// Pulls schedules for trainers and conflicts to check for overlaps
		let trainerSchedule = await loadAcceptedSchedule(session.trainer);
		let traineeSchedule = await loadAcceptedSchedule(session.trainee);
		let endTime = new Date(new Date(session.start).getTime() + (60000 * session.duration));
		let timeConflict = false;

		trainerSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)){
				Alert.alert('The Trainer has a session during this time.');
				timeConflict = true;
				return;
			}
		});

		traineeSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)){
				Alert.alert('The client is already booked during this time.');
				timeConflict = true;
				return;
			}
		});

		if (timeConflict) {
			return;
		}

		if(this.state.user.trainer && this.state.user.type === 'owner'){
			session.managed = true;
		}else{
			session.managed = false;
		}
		Alert.alert(
			'Accept Session',
			'Are you sure you want to accept this session?',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// creates session in database and moves session object to accepted sessions array for state
						try {
							await createSession(session, session.key, session.start, endTime);
							this.state.pendingSessions.splice(this.state.pendingSessions.indexOf(session), 1);
							this.state.acceptSessions.push(session);
							this.forceUpdate();
						} catch(error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error when accepting the session. Please try again later.');
						}

						// sends appropriate text message to trainer or trainee who requested session
						let phoneNumber, message;
						if (session.sentBy === 'trainer') {
							phoneNumber = session.trainerPhone;
							message = session.traineeName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						} else {
							phoneNumber = session.traineePhone;
							message = session.trainerName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						}
						try {
							sendMessage(phoneNumber, message);
						} catch (error) {
							this.bugsnagClient.notify('error');
							Alert.alert('There was an error sending a text message to the other person');
						}
					}
				}
			]
		);
	}

	cancelSession = (session) => {
		Alert.alert(
			'Cancel Session',
			'Are you sure you want to cancel this session?',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// cancels pending session and updates array for state
						try {
							await cancelPendingSession(session, session.key);
							this.state.pendingSessions.splice(this.state.pendingSessions.indexOf(session), 1);
							this.forceUpdate();
						} catch(error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was as error cancelling the sessions. Please try again later.');
							return;
						}

						// send appropriate text message to requested user
						let phoneNumber, message;
						if (session.sentBy === 'trainee') {
							phoneNumber = session.trainerPhone;
							message = session.traineeName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
						} else {
							phoneNumber = session.traineePhone;
							message = session.trainerName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
						}
						try {
							await sendMessage(phoneNumber, message);
						} catch (error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error sending a message to the other person.');
						}
					}
				}
			]
		);
	}

	//Cancel accept session as trainee
	cancelAccepted = async(session) => {
		if (new Date(session.start) <= new Date()) {
			Alert.alert("You cannot cancel a session after it has started!");
			return;
		}
		Alert.alert(
			'Cancel Session',
			'Are you sure you want to cancel this session?',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// cancels accepted session
						try {
							await cancelAcceptedSession(session, session.key);
							this.state.acceptSessions.splice(this.state.acceptSessions.indexOf(session), 1);
							this.forceUpdate();
						} catch(error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error cancelling this session. Please try again later');
							return;
						}
						
						// send appropriate text message
						let phoneNumber, message;
						if (this.state.user.trainer) {
							phoneNumber = session.traineePhone;
							message = session.trainerName + " has cancelled your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						} else {
							phoneNumber = session.trainerPhone;
							message = session.traineeName + " has cancelled your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						}
						try {
							await sendMessage(phoneNumber, message);
						} catch (error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error sending a message to the other person.');
						}
					}
				}
			]
		);
	}

	renderAccept = () => {
		var userKey = firebase.auth().currentUser.uid;
		if (!this.state.acceptSessions.length) {
			return (<Text style={styles.navText}>None</Text>);
		}
		return this.state.acceptSessions.map((session) => {

			const displayDate = dateToString(session.start);
			let name;
			if (session.trainee === userKey) {
				name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
			} else {
				name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
			}
			return (
				<View style={{ flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }} key={session.key}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						{name}
						<View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
						<View style={styles.timeView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
					</View>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelAccepted(session)}>
							<Text style={styles.buttonText}> Cancel </Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.buttonContainer} onPressIn={() => Actions.SessionPage({ session: session.key })}>
							<Text style={styles.buttonText}> Enter </Text>
						</TouchableOpacity>
					</View>
				</View>
			);
		});
	}

	renderPending = () => {
		const userKey = firebase.auth().currentUser.uid;
		if (!this.state.pendingSessions.length) {
			return (<Text style={styles.navText}>None</Text>);
		}

		return this.state.pendingSessions.map((session) => {
			const displayDate = dateToString(session.start);
			let button, button2, name;
			if ((session.trainee === userKey && session.sentBy == 'trainee') || (session.trainer == userKey && session.sentBy == 'trainer')) {
				button = (
					<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
						<Text style={styles.buttonText}> Cancel </Text>
					</TouchableOpacity>
				);
				if (session.trainee == userKey) {
					name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
				} else {
					name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
				}
			} else {
				button = (
					<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.acceptSession(session)}>
						<Text style={styles.buttonText}> Accept </Text>
					</TouchableOpacity>
				);
				button2 = (
					<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
						<Text style={styles.buttonText}> Reject </Text>
					</TouchableOpacity>
				);
				if (session.trainee === userKey) {
					name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
				} else {
					name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
				}
			}
			return (
				<View style={{ flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }} key={session.key}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						{name}
						<View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
						<View style={styles.timeView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
					</View>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						{button2}
						{button}
					</View>
				</View>
			);
		});
	}

	goActive = async() => {
		const userId = firebase.auth().currentUser.uid;
		await firebase.database().ref('users').child(userId).update({ active: true });
		await firebase.database().ref(`/gyms/${this.state.user.gym}/trainers/${userId}`).update({ active: true});
		Alert.alert('You are active now');
		this.state.user.active = true;
		this.forceUpdate();
		
	}

	hideandConfirm = () => {
		this.hidescheduleModal();
		setTimeout(() => Alert.alert('Availability Added.'), 700);
	}
 
	hidescheduleModal = () => {
		this.setState({ scheduleModal: false });
	}

	hidetrainerSchedule = () => this.setState({ trainerSchedule: false })

	render() {
		if (!this.state.acceptSessions || !this.state.user || !this.state.pendingSessions) {
			return <AppLoading />;
		}
		let active, schedule, scheduler;
		if (this.state.user.trainer) {
			if (this.state.user.active) {
				active = (<Text style={styles.statusText}>Active</Text>);
			} else {
				active = (
					<TouchableOpacity style={styles.activeButton} onPress={() => this.goActive()}>
						<Text style={styles.buttonText}>Go Active</Text>
					</TouchableOpacity>
				);
			}
			scheduler = (
				<TouchableOpacity style={styles.scheduleButton} onPress={() => this.setState({ scheduleModal: true })}>
					<Text style={styles.buttonText}>Set Schedule</Text>
				</TouchableOpacity>
			);
			schedule = (
				<TouchableOpacity style={styles.scheduleButton} onPress={() => this.setState({ trainerSchedule: true })}>
					<Text style={styles.buttonText}>View Schedule</Text>
				</TouchableOpacity>
			);
		}
		if (this.state.currentTab == 'pending') {
			var navBar = (
				<View style={styles.navigationBar}>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'pending' })}>
						<Text style={styles.activeText}>Awaiting Responses</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'accepted' })}>
						<Text style={styles.navText}>Upcoming Sessions</Text>
					</TouchableOpacity>
				</View>
			);
			var content = (
				<View style={styles.sessionContainer}>
					<ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
						{this.renderPending()}
						{active}
						{schedule}
						{scheduler}
					</ScrollView>
				</View>
			);
		} else {
			var navBar = (
				<View style={styles.navigationBar}>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'pending' })}>
						<Text style={styles.navText}>Awaiting Responses</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'accepted' })}>
						<Text style={styles.activeText}>Upcoming Sessions</Text>
					</TouchableOpacity>
				</View>
			);
			var content = (
				<View style={styles.sessionContainer}>
					<ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
						{this.renderAccept()}
						{active}
						{schedule}
						{scheduler}
					</ScrollView>
				</View>
			);
		}
		return (
			<View style={styles.container}>
				<View style={styles.headerContainer}>
					<Text style={styles.backButton} onPress={() => Actions.reset('MapPage')}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
					</Text>
					<Text style={styles.title}>Calendar</Text>
				</View>
				{navBar}
				{content}
				<Modal isVisible={this.state.scheduleModal}
				onBackdropPress={this.hidescheduleModal}>
					<SchedulerModal trainerKey={firebase.auth().currentUser.uid} hide={this.hidescheduleModal} hideandConfirm={this.hideandConfirm} />
				</Modal>
				<Modal isVisible={this.state.trainerSchedule}
				onBackdropPress={this.hidetrainerSchedule}>
					<TrainerSchedule trainerKey={firebase.auth().currentUser.uid} hideandOpen={this.hidetrainerSchedule} />
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
	sessionContainer: {
		flex: 6,
		width: '100%',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	center: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	headerContainer: {
		flex: 1,
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end'
	},
	title: {
		fontSize: 35,
		color: COLORS.PRIMARY,
		fontWeight: '700',
		textAlign: 'center'
	},
	navigationBar: {
		width: '100%',
		height: 100,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	activeTab: {
		width: '50%',
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	inactiveTab: {
		width: '50%',
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
	trainerView: {
		width: '33%',
		height: 50
	},
	timeView: {
		width: '37%',
		height: 50
	},
	trainerInfo: {
		paddingVertical: 15,
		textAlign: 'center',
		fontSize: 15,
		fontWeight: '700',
		color: COLORS.PRIMARY,
	},
	rateView: {
		width: '20%',
		height: 50
	},
	buttonContainer: {
		borderRadius: 5,
		width: 100,
		padding: 10,
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	activeButton: {
		borderRadius: 5,
		padding: 10,
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		marginTop: 20
	},
	scheduleButton: {
		borderRadius: 5,
		padding: 10,
		height: 48,
		width: 200,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		marginTop: 15
	},
	denyContainer: {
		borderRadius: 5,
		width: 100,
		padding: 10,
		height: 48,
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	statusText: {
		textAlign: 'center',
		color: COLORS.SECONDARY,
		fontWeight: '700',
		fontSize: 25,
		marginTop: 20
	},
	backButton: {
		position: 'absolute',
		left: 20,
		fontSize: 35,
		paddingBottom: 5,
		fontWeight: '700',
		color: COLORS.SECONDARY,
	}
})