import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import COLORS from './Colors';
import { dateToString, timeOverlapCheck, loadUser, loadAcceptedSessions, loadPendingSessions, loadAcceptedSchedule, createSession, sendMessage, cancelPendingSession, cancelAcceptedSession } from './Functions';
import Modal from 'react-native-modal';
import { SchedulerModal } from './SchedulerModal';
import { TrainerSchedule } from './TrainerSchedule';

export class SessionModal extends Component {

	constructor(props) {
		super(props);
		this.state = {
			sessionsLoaded: false,
			scheduleModal: false,
			trainerSchedule: false,
			currentTab: 'pending',
		}
	}

	async componentDidMount() {
		let uid = firebase.auth().currentUser.uid;
		if (!this.state.user || !this.state.sessionsLoaded) {
			let user = await loadUser(uid);

			let pendingSessions, acceptSessions;
			if(user.trainer){
				pendingSessions = await loadPendingSessions(uid, 'trainer');
				acceptSessions = await loadAcceptedSessions(uid, 'trainer');
			}else{
				pendingSessions = await loadPendingSessions(uid, 'trainee');
				acceptSessions = await loadAcceptedSessions(uid, 'trainee')
			}
			this.setState({user, pendingSessions, acceptSessions, sessionsLoaded: true});
			this.markRead(pendingSessions, acceptSessions, user);
		}
	}

	markRead(pendingSessions, acceptSessions, user) {
		// marks sessions as read in database to prevent new session alert message from appearing twice
		pendingSessions.map(function (session) {
			if ((user.trainer && session.sentBy == 'trainee') || (!user.trainer && session.sentBy == 'trainer')) {
					firebase.database().ref('/pendingSessions/' + session.key).update({ read: true });
			}
		});
		acceptSessions.map(function (session) {
			if ((user.trainer && session.sentBy == 'trainer') || (!user.trainer && session.sentBy == 'trainee')) {
					firebase.database().ref('/trainSessions/' + session.key).update({ read: true });
			}
		});
	}

	async acceptSession(session) {
		// Pulls schedules for trainers and conflicts to check for overlaps
		let trainerSchedule = await loadAcceptedSchedule(session.trainer);
		let traineeSchedule = await loadAcceptedSchedule(session.trainee);
		let endTime = new Date(new Date(session.start).getTime() + (60000 * session.duration));

		trainerSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)){
				Alert.alert('The Trainer has a session during this time.');
				return;
			}
		});

		traineeSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)){
				Alert.alert('The client is already booked during this time.');
				return;
			}
		});

		// Creates session if user accepts
		let pendingSessions = this.state.pendingSessions;
		let acceptSessions = this.state.acceptSessions;
		Alert.alert(
			'Are you sure you want to accept this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// creates session in database and moves session object to accepted sessions array for state
						createSession(session, session.key, session.start, endTime);
						pendingSessions.splice(pendingSessions.indexOf(session), 1);
						acceptSessions.push(session);

						// sends appropriate text message to trainer or trainee who requested session
						let phoneNumber, message;
						if (session.sentBy == 'trainer') {
							phoneNumber = session.trainerPhone;
							message = session.traineeName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						} else {
							phoneNumber = session.traineePhone;
							message = session.trainerName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
						}
						try {
							sendMessage(phoneNumber, message);
						} catch (error) {
							console.log(error);
						}

						// updates state with new session arrays
						this.setState({ pendingSessions, acceptSessions });
					}
				}]);
	}

	cancelSession(session) {
		let pendingSessions = this.state.pendingSessions;
		Alert.alert(
			'Are you sure you want to cancel this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// cancels pending session and updates array for state
						cancelPendingSession(session, session.key);
						pendingSessions.splice(pendingSessions.indexOf(session), 1);

						// send appropriate text message to requested user
						let phoneNumber, message;
						if (session.sentBy == 'trainee') {
							phoneNumber = session.trainerPhone;
							message = session.traineeName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
						} else {
							phoneNumber = session.traineePhone;
							message = session.trainerName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
						}
						try {
							sendMessage(phoneNumber, message);
						} catch (error) {
							console.log(error);
						}
						this.setState({ pendingSessions: pendingSessions });
					}
				}
			]
		);
	}

	//Cancel accept session as trainee
	cancelAccepted(session) {
		if (new Date(session.start) <= new Date()) {
			Alert.alert("You cannot cancel a session after it has started!");
			return;
		}
		var acceptSessions = this.state.acceptSessions;
		Alert.alert(
			'Are you sure you want to cancel this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						// cancels accepted session
						cancelAcceptedSession(session, session.key);
						acceptSessions.splice(acceptSessions.indexOf(session), 1);
						
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
							sendMessage(phoneNumber, message);
						} catch (error) {
							console.log(error);
						}
						this.setState({ acceptSessions: acceptSessions });
					}
				}]);
	}

	renderAccept() {
		var userKey = firebase.auth().currentUser.uid;
		if (this.state.acceptSessions.length == 0) {
			return (<Text style={styles.navText} >None</Text>);
		}
		var acceptList = this.state.acceptSessions.map(function (session) {

			var displayDate = dateToString(session.start);
			if (session.trainee == userKey) {
				var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
			} else {
				var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
			}
			return (
				<View style={{ flexDirection: 'column', justifyContent: 'flex-start' }} key={session.key}>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						{name}
						<View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
						<View style={styles.timeView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
					</View>
					<View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
						<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelAccepted(session)}>
							<Text style={styles.buttonText}> Cancel Session </Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.buttonContainer} onPressIn={() => Actions.session({ session: session.key })}>
							<Text style={styles.buttonText}> Enter Session </Text>
						</TouchableOpacity>
					</View>
				</View>
			);
		}.bind(this));
		return acceptList;
	}

	renderPending() {
		var userKey = firebase.auth().currentUser.uid;
		if (this.state.pendingSessions.length == 0) {
			return (<Text style={styles.navText}>None</Text>);
		}
		var pendingList = this.state.pendingSessions.map(function (session) {

			var displayDate = dateToString(session.start);
			if ((session.trainee == userKey && session.sentBy == 'trainee') || (session.trainer == userKey && session.sentBy == 'trainer')) {
				var button = (
					<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
						<Text
							style={styles.buttonText}
						>
							Cancel Session
	              </Text>
					</TouchableOpacity>);
				if (session.trainee == userKey) {
					var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
				} else {
					var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
				}
			} else {
				var button = (
					<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.acceptSession(session)}>
						<Text
							style={styles.buttonText}
						>
							Accept Session
	              </Text>
					</TouchableOpacity>);
				var button2 = (
					<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
						<Text
							style={styles.buttonText}
						>
							Deny Session
	              </Text>
					</TouchableOpacity>);
				if (session.trainee == userKey) {
					var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
				} else {
					var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
				}
			}
			return (
				<View style={{ flexDirection: 'column', justifyContent: 'flex-start' }} key={session.key}>
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
		}.bind(this));
		return pendingList;
	}

	goActive() {
		firebase.database().ref('users').child(firebase.auth().currentUser.uid).update({ active: true });
		Alert.alert('You are active now');
		var user = this.state.user;
		user.active = true;
		this.setState({ user: user });
	}

	hidescheduleModal = () => {
		this.setState({ scheduleModal: false });
		setTimeout(() => Alert.alert('Availability Added.'), 700);
	}

	hidetrainerSchedule = () => {
		this.setState({ trainerSchedule: false });
	}

	render() {
		if (!this.state.sessionsLoaded || !this.state.user) {
			return <AppLoading />;
		} else {
			var active = schedule = scheduler = null;
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
					<ScrollView contentContainerStyle={styles.sessionContainer} showsVerticalScrollIndicator={false}>
						{this.renderPending()}
						{active}
						{schedule}
						{scheduler}
					</ScrollView>
				);
			} else {
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'pending' })}>
							<Text style={styles.navText}>Awaiting Response</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'accepted' })}>
							<Text style={styles.activeText}>Upcoming Sessions</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView contentContainerStyle={styles.sessionContainer} showsVerticalScrollIndicator={false}>
						{this.renderAccept()}
						{active}
						{schedule}
						{scheduler}
					</ScrollView>
				);
			}
			return (
				<View style={styles.container}>
					<Text style={styles.backButton} onPress={() => Actions.reset('map')}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
					</Text>
					<Text style={styles.title}>Calendar</Text>
					{navBar}
					{content}
					<Modal isVisible={this.state.scheduleModal}
          onBackdropPress={this.hidescheduleModal}>
            <SchedulerModal trainerKey={firebase.auth().currentUser.uid} hide={this.hidescheduleModal} />
          </Modal>
					<Modal isVisible={this.state.trainerSchedule}
					onBackdropPress={this.hidetrainerSchedule}>
						<TrainerSchedule trainerKey={firebase.auth().currentUser.uid} hide={this.hidetrainerSchedule} />
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
	sessionContainer: {
		flex: .4,
		width: '100%',
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
		width: '35%',
		height: 50
	},
	timeView: {
		width: '30%',
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
		width: '18%',
		height: 50
	},
	buttonContainer: {
		padding: 10,
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	activeButton: {
		padding: 10,
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		marginTop: 20
	},
	scheduleButton: {
		padding: 10,
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		marginTop: 15
	},
	denyContainer: {
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
		top: 45,
		left: 20,
		fontSize: 35,
		color: COLORS.SECONDARY,
		lineHeight: 20
	}
})