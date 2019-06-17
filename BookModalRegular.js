import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, Picker } from 'react-native';
import firebase from 'firebase';
import { AppLoading } from 'expo';
import COLORS from './Colors';
import { dateToString } from './Functions';

export class BookModalRegular extends Component {
	constructor(props) {
		super(props);
		this.state = {
			trainer: 'null',
			bookDate: new Date(),
			bookDuration: '60',
			user: 'null',
			gym: 'null'
		};

		this.bookTrainer = this.bookTrainer.bind(this);
		this.loadTrainer = this.loadTrainer.bind(this);
		this.loadGym = this.loadGym.bind(this);
	}

	async componentDidMount() {
		var trainer = await this.loadTrainer(this.props.trainer);
		var gym = await this.loadGym(this.props.gym);

		// Get user info for state
		var user = firebase.auth().currentUser;
		var usersRef = firebase.database().ref('users');
		usersRef.orderByKey().equalTo(user.uid).on('child_added', function (snapshot) {
			this.setState({ user: snapshot.val(), gym: gym, trainer: trainer });
		}.bind(this));
	}

	// Loads selected trainer Info from db
	async loadTrainer(trainerKey) {
		var trainer;
		await firebase.database().ref('users').child(trainerKey).once('value', function (snapshot) {
			trainer = snapshot.val();
		}.bind(this));
		return trainer;
	}

	async loadGym(gymKey) {
		var gym;
		await firebase.database().ref('gyms').child(gymKey).once('value', function (snapshot) {
			gym = snapshot.val()
		}.bind(this));
		return gym;
	}

	// book a session with a trainer
	async bookTrainer() {
		var user = firebase.auth().currentUser;
		var pendingRef = firebase.database().ref('pendingSessions');

		if (!this.state.user.cardAdded) {
			Alert.alert('You must have a card on file to book a session.');
			return;
		}
		if (user.uid == this.state.trainer.key) {
			Alert.alert('You cannot book yourself as a Trainer!');
			return;
		}
		if (this.state.trainer.active == false) {
			Alert.alert('Sorry, this trainer is no longer active.');
			return;
		}

		// Pulls schedules for trainers and conflicts to check for overlaps
    var timeConflict = false;
    var startTime = this.state.bookDate;
    var endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));

    firebase.database().ref('/users/' + user.uid +'/pendingschedule/').once('value', function (snapshot) {
      snapshot.forEach(function (session){
        let currSession = session.val();
        if(timeOverlapCheck(currSession.start, currSession.end, startTime, endTime)){
          timeConflict = true;
          Alert.alert('You have a pending session during this sessions time. Either wait for a response or cancel your request.');
          return;
        }
      });
    });

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

    firebase.database().ref('/users/' + this.props.trainer +'/schedule/').once('value', function (snapshot) {
      snapshot.forEach(function (session){
        let currSession = session.val();
        if(timeOverlapCheck(currSession.start, currSession.end, startTime, endTime)){
          timeConflict = true;
          Alert.alert('The trainer is already booked from' + dateToString(currSession.start) + ' to ' + dateToString(currSession.end));
          return;
        }
      });
    });

    if(timeConflict){
      return;
    }

		var price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);

		Alert.alert(
			'Request session with ' + this.state.trainer.name + ' for $' + price + ' at ' + dateToString(this.state.bookDate),
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						var sessionKey = pendingRef.push({
							trainee: user.uid,
							traineeName: this.state.user.name,
							trainer: this.props.trainer,
							trainerName: this.state.trainer.name,
							start: this.state.bookDate.toString(),
							duration: this.state.bookDuration,
							location: this.state.gym.location,
							gym: this.state.gym.name,
							rate: this.state.trainer.rate,
							read: false,
							traineeStripe: this.state.user.stripeId,
							trainerStripe: this.state.trainer.stripeId,
							traineePhone: this.state.user.phone,
							trainerPhone: this.state.trainer.phone,
							sentBy: 'trainee'
						}).key;
						firebase.database().ref('users/' + user.uid + '/pendingschedule/').child(sessionKey).set({
              start: this.state.bookDate.toString(),
              end: end.toString()
            });
            firebase.database().ref('users/' + this.props.trainer + '/pendingschedule/').child(sessionKey).set({
              start: this.state.bookDate.toString(),
              end: end.toString()
            });
						try {
							var message = this.state.user.name + " has requested a session at " + dateToString(this.state.bookDate) + " for " + this.state.bookDuration + " mins.";
							const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
								method: 'POST',
								body: JSON.stringify({
									phone: this.state.trainer.phone,
									message: message
								}),
							});
							const data = await res.json();
							data.body = JSON.parse(data.body);
						} catch (error) {
							console.log(error);
						}
						this.props.hide();
						setTimeout(this.props.confirm, 1000);
					}
				},
			]
		);
	}

	render() {
		if (this.state.trainer == 'null' || this.state.trainer == null || this.state.gym == 'null') {
			return <Expo.AppLoading />
		} else {
			return (
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
						<Text style={styles.trainerName}>{this.state.trainer.name}</Text>
					</View>
					<View style={styles.formContainer}>
						<Text style={styles.bookDetails}>{this.state.gym.name}</Text>
						<Text style={{fontSize:20, color: COLORS.PRIMARY, fontWeight: '500'}}>Session Time</Text>
						<View style={styles.inputRow}>
							<View style={styles.datePickerHolder}>
								<DatePickerIOS
									mode='datetime'
									itemStyle={{ color: COLORS.PRIMARY }}
									textColor={COLORS.PRIMARY}
									style={styles.datepicker}
									minuteInterval={5}
									minimumDate={new Date(new Date().getTime())}
									date={this.state.bookDate}
									onDateChange={(bookDate) => this.setState({ bookDate: bookDate })}
								/>
							</View>
						</View>
						<View style={styles.inputRow}>
							<Text style={styles.bookFormLabel}>Session Duration</Text>
							<Picker
								style={styles.picker}
								itemStyle={{ height: 70, color: COLORS.PRIMARY }}
								selectedValue={this.state.bookDuration}
								onValueChange={(itemValue, itemIndex) => this.setState({ bookDuration: itemValue })}>
								<Picker.Item label='60' value='60' />
								<Picker.Item label='90' value='90' />
								<Picker.Item label='120' value='120' />
							</Picker>
						</View>
						<TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookTrainer()}>
							<Text style={styles.buttonText}>
								Schedule Session
			        </Text>
						</TouchableOpacity>
					</View>
				</View>
			)
		}
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .9,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	trainerName: {
		fontSize: 30,
		color: COLORS.WHITE,
		fontWeight: '500'
	},
	nameContainer: {
		height: '12%',
		width: '100%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	bookDetails: {
		fontSize: 20,
		fontWeight: '500',
		color: COLORS.PRIMARY
	},
	bookFormLabel: {
		fontSize: 20,
		fontWeight: '500',
		width: '33%',
		textAlign: 'center',
		color: COLORS.PRIMARY
	},
	formContainer: {
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '95%',
		height: '85%'
	},
	datePickerHolder: {
		height: 200,
		width: '100%',
	},
	datepicker: {
		height: 200,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
	},
	picker: {
		height: 70,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		width: '65%',
	},
	bookButton: {
		paddingVertical: 15,
		backgroundColor: COLORS.SECONDARY,
		width: '70%',
		marginTop: 10
	},
	inputRow: {
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 10
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	}
})