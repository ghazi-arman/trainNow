import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, Picker, Image } from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { dateToString, timeOverlapCheck, loadUser, loadGym, loadAcceptedSchedule, loadPendingSchedule, createPendingSession, sendMessage, loadOtherTrainer } from '../components/Functions';
const loading = require('../images/loading.gif');

export class BookModalRegular extends Component {
	constructor(props) {
		super(props);
		this.state = {
			bookDate: new Date(),
			bookDuration: '60',
		};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if(!this.state.trainer || !this.state.user || !this.state.gym){
			try {
				let trainer = await loadOtherTrainer(this.props.trainer);
				let user = await loadUser(firebase.auth().currentUser.uid);
				let gym = await loadGym(this.props.gym);
				this.setState({ user, trainer, gym });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the trainer. Please try again later.');
				this.props.hide();
			}
		}
	}

	bookTrainer = async() => {
		const user = firebase.auth().currentUser;
		if (!this.state.user.cardAdded) {
			Alert.alert('You must have a card on file to book a session.');
			return;
		}
		if (user.uid === this.state.trainer.key) {
			Alert.alert('You cannot book yourself as a Trainer!');
			return;
		}

		// Pulls schedules for trainers and conflicts to check for overlaps
    const trainerSchedule = await loadAcceptedSchedule(this.props.trainer);
    const pendingSchedule = await loadPendingSchedule(user.uid);
    let traineeSchedule = await loadAcceptedSchedule(user.uid);
    traineeSchedule = traineeSchedule.concat(pendingSchedule);
		const endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));
		let timeConflict = false;

		trainerSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('The Trainer has a session during this time.');
				timeConflict = true;
				return;
			}
		});

		traineeSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('You already have a pending session or session during this time.');
				timeConflict = true;
				return;
			}
		});

		if(timeConflict) return;
		
		// create session in pending table
    const price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);
    let trainer = this.state.trainer;
    let trainee = this.state.user;
    trainee.uid = firebase.auth().currentUser.uid;
    trainer.key = this.props.trainer;
    Alert.alert(
      `Book Session`,
      `Request session with ${this.state.trainer.name} for $${price} at ${dateToString(this.state.bookDate)}`,
      [
        { text: 'No' },
        {
          text: 'Yes', onPress: async () => {
            createPendingSession(trainee, trainer, this.state.gym, this.state.bookDate, this.state.bookDuration, 'trainee', true);
            try {
              const message = `${this.state.user.name} has requested a session at ${dateToString(this.state.bookDate)} for ${this.state.bookDuration} mins.`;
              sendMessage(this.state.trainer.phone, message);
            } catch (error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error sending a notification text to the trainer.');
            } finally {
							this.props.hide();
							setTimeout(this.props.confirm, 1000);
						}
          }
        }
      ]
    );
	}

	render() {
		if (!this.state.trainer || !this.state.user || !this.state.gym) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		return (
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.trainerName}>{this.state.trainer.name}</Text>
					<Text style={styles.closeButton} onPress={this.props.hide}>
						<FontAwesome name="close" size={35} />
					</Text>
				</View>
				<View style={styles.formContainer}>
					<View style={styles.inputRow}>
					<Text style={styles.formLabel}>Session Duration</Text>
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
						<Text style={styles.formLabel}>Session Duration</Text>
						<Picker
							style={styles.picker}
							itemStyle={{ height: 70, color: COLORS.PRIMARY }}
							selectedValue={this.state.bookDuration}
							onValueChange={(itemValue, itemIndex) => this.setState({ bookDuration: itemValue })}>
							<Picker.Item label='1 hour' value='60' />
							<Picker.Item label='90 minuts' value='90' />
							<Picker.Item label='2 hours' value='120' />
						</Picker>
					</View>
					<TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookTrainer()}>
						<Text style={styles.buttonText}>
							Schedule Session
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
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
		fontWeight: '500',
		textAlign: 'center'
	},
	nameContainer: {
		flex: 1,
		width: '100%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	closeButton: {
		position: 'absolute',
		top: 0,
		right: 0,
		fontSize: 35,
		color: COLORS.RED,
	},
	formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.PRIMARY,
    marginBottom: 15,
  },
	formContainer: {
		flex: 6,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '95%',
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
		width: '100%',
	},
	bookButton: {
		paddingVertical: 10,
		backgroundColor: COLORS.SECONDARY,
		width: '70%',
		borderRadius: 5
	},
  inputRow: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
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
})