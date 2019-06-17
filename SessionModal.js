import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { MapView, AppLoading } from 'expo';
import COLORS from './Colors';
import { dateToString, timeOverlapCheck } from './Functions';

export class SessionModal extends Component {

	constructor(props) {
		super(props);
		this.state = {
			pendingSessions: [],
			acceptSessions: [],
			pendingLoaded: false,
			acceptLoaded: false,
			currentTab: 'pending',
			user: 'null'
		}
		this.acceptSession = this.acceptSession.bind(this);
		this.loadSessions = this.loadSessions.bind(this);
		this.goActive = this.goActive.bind(this);
	}

	async componentDidMount() {
		var user = firebase.auth().currentUser;
		if (this.state.pendingLoaded == false && this.state.acceptLoaded == false) {
			const loading = await this.loadSessions(user.uid);
			this.markRead();
		}
		var usersRef = firebase.database().ref('users');
		usersRef.orderByKey().equalTo(user.uid).once('child_added', function (snapshot) {
			this.setState({ user: snapshot.val() });
		}.bind(this));
	}

	//Load Pending sessions still awaiting accept by trainer
	async loadSessions(userKey) {
		var pendingRef = firebase.database().ref('pendingSessions');
		var acceptRef = firebase.database().ref('trainSessions');
		var usersRef = firebase.database().ref('users');
		var pendingSessions = [];
		var acceptSessions = [];
		var acceptSession = null;
		var pendingSession = null;

		const loading = await usersRef.orderByKey().equalTo(userKey).once('child_added', function (snapshot) {
			var currentUser = snapshot.val();

			if (currentUser.trainer) {

				pendingRef.orderByChild('trainer').equalTo(userKey).once('value', function (data) {
					data.forEach(function (snapshot) {
						pendingSession = snapshot.val();
						if (pendingSession != null && pendingSession.end == null) {
							pendingSession.key = snapshot.key;
							pendingSessions.push(pendingSession);
						}
					});
					this.setState({ pendingSessions: pendingSessions, pendingLoaded: true });
				}.bind(this));

				acceptRef.orderByChild('trainer').equalTo(userKey).once('value', function (data) {
					data.forEach(function (snapshot) {
						acceptSession = snapshot.val();
						if (acceptSession != null && acceptSession.end == null) {
							acceptSession.key = snapshot.key;
							acceptSessions.push(acceptSession);
						}
					});
					this.setState({ acceptSessions: acceptSessions, acceptLoaded: true });
				}.bind(this));

			} else {

				pendingRef.orderByChild('trainee').equalTo(userKey).once('value', function (data) {
					data.forEach(function (snapshot) {
						pendingSession = snapshot.val();
						if (pendingSession != null && pendingSession.end == null) {
							pendingSession.key = snapshot.key;
							pendingSessions.push(pendingSession);
						}
					});
					this.setState({ pendingSessions: pendingSessions, pendingLoaded: true });
				}.bind(this));

				acceptRef.orderByChild('trainee').equalTo(userKey).once('value', function (data) {
					data.forEach(function (snapshot) {
						acceptSession = snapshot.val();
						if (acceptSession != null && acceptSession.end == null) {
							acceptSession.key = snapshot.key;
							acceptSessions.push(acceptSession);
						}
					});
					this.setState({ acceptSessions: acceptSessions, acceptLoaded: true });
				}.bind(this));
			}
		}.bind(this));
	}

	//mark all sessions shown to user as read in db
	markRead() {
		var user = firebase.auth().currentUser;
		if (this.state.pendingSessions.length > 0) {
			this.state.pendingSessions.map(function (session) {
				if ((user.uid == session.trainer && session.sentBy == 'trainee') || (user.uid == session.trainee && session.sentBy == 'trainer')) {
					firebase.database().ref('/pendingSessions/' + session.key).update({
						read: true
					});
				}
			});
		}
		if (this.state.acceptSessions.length > 0) {
			this.state.acceptSessions.map(function (session) {
				if ((user.uid == session.trainer && session.sentBy == 'trainer') || (user.uid == session.trainee && session.sentBy == 'trainee')) {
					firebase.database().ref('/trainSessions/' + session.key).update({
						read: true
					});
				}
			});
		}
	}

	//Enter session
	enterSession(session) {
		Actions.session({ session: session });
	}
	//Go to map
	goToMap() {
		Actions.reset('map');
	}

	//Accept pending Session as trainer
	async acceptSession(session) {
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('trainSessions');
		var pendingRef = firebase.database().ref('pendingSessions');
		var pendingSessions = this.state.pendingSessions;
		var acceptSessions = this.state.acceptSessions;

		// Pulls schedules for trainers and conflicts to check for overlaps
		var timeConflict = false;
		var startTime = session.start;
		var endTime = new Date(new Date(session.start).getTime() + (60000 * session.duration));

		firebase.database().ref('/users/' + user.uid +'/schedule/').once('value', function (snapshot) {
			snapshot.forEach(function (session){
				let currSession = session.val();
				if(timeOverlapCheck(currSession.start, currSession.end, startTime, endTime)){
					timeConflict = true;
					Alert.alert('You have a session during this time. Either cancel your session or book a different time.');
					return;
				}
			});
		});

		firebase.database().ref('/users/' + session.trainee +'/schedule/').once('value', function (snapshot) {
			snapshot.forEach(function (session){
				let currSession = session.val();
				if(timeOverlapCheck(currSession.start, currSession.end, startTime, endTime)){
					timeConflict = true;
					Alert.alert('The client is already booked from' + dateToString(currSession.start) + ' to ' + dateToString(currSession.end));
					return;
				}
			});
		});

		if(timeConflict){
			return;
		}

		Alert.alert(
			'Are you sure you want to accept this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						sessionRef.child(session.key).set({
							trainee: session.trainee,
							trainer: session.trainer,
							traineeName: session.traineeName,
							trainerName: session.trainerName,
							start: session.start,
							duration: session.duration,
							location: session.location,
							rate: session.rate,
							gym: session.gym,
							sentBy: session.sentBy,
							traineeStripe: session.traineeStripe,
							trainerStripe: session.trainerStripe,
							traineePhone: session.traineePhone,
							trainerPhone: session.trainerPhone,
							traineeLoc: null,
							trainerLoc: null,
							trainerReady: false,
							traineeReady: false,
							met: false,
							read: false,
							end: null,
							traineeRating: null,
							trainerRating: null,
							traineeEnd: false,
							trainerEnd: false,
						});
						pendingRef.child(session.key).remove();
						pendingSessions.splice(pendingSessions.indexOf(session), 1);
						firebase.database().ref('/users/' + session.trainee + '/pendingschedule/').child(session.key).remove();
						firebase.database().ref('/users/' + session.trainer + '/pendingschedule/').child(session.key).remove();
						acceptSessions.push(session);
						firebase.database().ref('users/' + session.trainee + '/schedule/').child(session.key).set({
              start: startTime.toString(),
              end: endTime.toString()
            });
            firebase.database().ref('users/' + session.trainer + '/schedule/').child(session.key).set({
              start: startTime.toString(),
              end: endTime.toString()
            });
						try {
							if (session.sentBy == 'trainer') {
								var toPhone = session.trainerPhone;
								var message = session.traineeName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
							} else {
								var toPhone = session.traineePhone;
								var message = session.trainerName + " has accepted your session at " + dateToString(session.start) + " for " + session.duration + " mins";
							}
							const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
								method: 'POST',
								body: JSON.stringify({
									phone: toPhone,
									message: message
								}),
							});
							const data = await res.json();
							data.body = JSON.parse(data.body);
							console.log(data.body);
						} catch (error) {
							console.log(error);
						}
						this.setState({ pendingSessions: pendingSessions, acceptSessions: acceptSessions });
					}
				}]);
	}

	// Cancel pending session as trainee
	cancelSession(session) {
		var user = firebase.auth().currentUser;
		var pendingSessions = this.state.pendingSessions;
		var pendingRef = firebase.database().ref('pendingSessions');
		Alert.alert(
			'Are you sure you want to cancel this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						pendingRef.child(session.key).remove();
						pendingSessions.splice(pendingSessions.indexOf(session), 1);
						firebase.database().ref('/users/' + session.trainee + '/pendingschedule/').child(session.key).remove();
						firebase.database().ref('/users/' + session.trainer + '/pendingschedule/').child(session.key).remove();
						try {
							if (session.sentBy == 'trainee') {
								var toPhone = session.trainerPhone;
								var message = session.traineeName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
							} else {
								var toPhone = session.traineePhone;
								var message = session.trainerName + " has cancelled the requested session at " + dateToString(session.start) + " for " + session.duration + " mins";
							}
							const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
								method: 'POST',
								body: JSON.stringify({
									phone: toPhone,
									message: message
								}),
							});
							const data = await res.json();
							data.body = JSON.parse(data.body);
							console.log(data.body);
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
	cancelAccept(session) {
		if (new Date(session.start) <= new Date()) {
			Alert.alert("You cannot cancel a session after it has started!");
			return;
		}
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('trainSessions');
		var cancelRef = firebase.database().ref('cancelSessions');
		var acceptSessions = this.state.acceptSessions;
		Alert.alert(
			'Are you sure you want to cancel this session?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						cancelRef.push(session);
						sessionRef.child(session.key).remove();
						acceptSessions.splice(acceptSessions.indexOf(session), 1);
						firebase.database().ref('/users/' + session.trainee + '/schedule/').child(session.key).remove();
						firebase.database().ref('/users/' + session.trainer + '/schedule/').child(session.key).remove();
						try {
							if (user.uid == session.trainer) {
								var toPhone = session.traineePhone;
								var message = session.trainerName + " has cancelled your session at " + dateToString(session.start) + " for " + session.duration + " mins";
							} else {
								var toPhone = session.trainerPhone;
								var message = session.traineeName + " has cancelled your session at " + dateToString(session.start) + " for " + session.duration + " mins";
							}
							const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
								method: 'POST',
								body: JSON.stringify({
									phone: toPhone,
									message: message
								}),
							});
							const data = await res.json();
							data.body = JSON.parse(data.body);
							console.log(data.body);
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
						<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelAccept(session)}>
							<Text style={styles.buttonText}> Cancel Session </Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.enterSession(session.key)}>
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

	render() {
		if (this.state.pendingLoaded == false && this.state.acceptLoaded == false || this.state.user == 'null') {
			return <Expo.AppLoading />;
		} else {
			var active = schedule = null;
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
				schedule = (
					<TouchableOpacity style={styles.scheduleButton} onPress={() => this.openScheduler()}>
						<Text style={styles.buttonText}>Set Schedule</Text>
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
					</ScrollView>
				);
			}
			return (
				<View style={styles.container}>
					<Text style={styles.backButton} onPress={this.goToMap}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
					</Text>
					<Text style={styles.title}>Calendar</Text>
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