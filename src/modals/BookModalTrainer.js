import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, DatePickerAndroid, Picker, Image, Platform } from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { dateToString, timeOverlapCheck, loadUser, loadGym, loadAcceptedSchedule, loadPendingSchedule, createPendingSession, sendMessage, loadClient } from '../components/Functions';
const loading = require('../images/loading.gif');

export class BookModalTrainer extends Component {
	constructor(props) {
		super(props);
		this.state = {
			bookDate: new Date(),
			bookDuration: '60',
		};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if(!this.state.trainer || !this.state.client || !this.state.gym){
			try {
				var client = await loadClient(this.props.client);
				var gym = await loadGym(this.props.gym);
				var trainer = await loadUser(firebase.auth().currentUser.uid);
				this.setState({ client, gym, trainer, bookDate: new Date(new Date().getTime() + trainer.offset * 60000) });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading this client. Please try again later.');
				this.props.hide();
			}
		}
	}

	bookClient = async() => {
		if (!this.state.client.cardAdded) {
			Alert.alert('This client no longer has a card on file.');
			return;
		}
		
		// Pulls schedules for trainers and conflicts to check for overlaps
		const user = firebase.auth().currentUser;    
		let trainerSchedule = await loadAcceptedSchedule(user.uid);
		const pendingSchedule = await loadPendingSchedule(user.uid);
		const clientSchedule = await loadAcceptedSchedule(this.props.client);
		trainerSchedule = trainerSchedule.concat(pendingSchedule);
		const endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));
		let timeConflict = false;

		trainerSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('You have a session or pending session during this time.');
				timeConflict = true;
				return;
			}
		});

		clientSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('The client has a pending session or session during this time.');
				timeConflict = true;
				return;
			}
		});

		if(timeConflict) return;

		// create session in pending table
    const price = (this.state.trainer.rate * (parseInt(this.state.bookDuration) / 60)).toFixed(2);
    let trainer = this.state.trainer;
    let client = this.state.client;
    client.key = this.props.client;
    trainer.key = user.uid;
    Alert.alert(
      `Book Session`,
      `Request session with ${this.state.trainer.name} for $${price} at ${dateToString(this.state.bookDate)}`,
      [
        { text: 'No' },
        {
          text: 'Yes', onPress: async () => {
            createPendingSession(client, trainer, this.state.gym, this.state.bookDate, this.state.bookDuration, 'trainer', true);
            try {
              const message = `${this.state.client.name} has requested a session at ${dateToString(this.state.bookDate)} for ${this.state.bookDuration} mins.`;
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

	openDatePicker = async() => {
    try {
      const {action, year, month, day} = await DatePickerAndroid.open({
				date: new Date(),
				minDate: new Date(new Date().getTime() + this.state.trainer.offset * 60000)
      });
      if (action !== DatePickerAndroid.dismissedAction) {
        this.setState({ bookDate: new Date(year, month, day)});
      }
    } catch (error) {
      this.bugsnagClient.notify(error);
    }
  }

  openTimePicker = async() => {
    try {
      const {action, hour, minute} = await TimePickerAndroid.open({
        hour: 0,
        minute: 0,
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        const date = this.state.bookDate;
        this.setState({ bookDate: date.setHours(hour, minute)});
      }
    } catch ({code, message}) {
      console.warn('Cannot open time picker', message);
    }
  }

	render() {
		if (!this.state.client || !this.state.trainer || !this.state.gym) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		let picker, timePicker;
		if(Platform.OS === 'ios') {
			picker = (
				<DatePickerIOS
					mode='datetime'
					itemStyle={{ color: COLORS.PRIMARY }}
					textColor={COLORS.PRIMARY}
					style={styles.datepicker}
					minuteInterval={5}
					minimumDate={new Date(new Date().getTime() + this.state.trainer.offset * 60000)}
					date={this.state.bookDate}
					onDateChange={(bookDate) => this.setState({ bookDate: bookDate })}
				/>
			);
		} else {
			picker = (
				<TouchableOpacity style={styles.bookButton} onPressIn={() => this.openDatePicker()}>
          <Text style={styles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      timePicker = (
        <TouchableOpacity style={[styles.bookButton, {marginTop: 20}]} onPressIn={() => this.openTimePicker()}>
          <Text style={styles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
		}
		return (
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.trainerName}>{this.state.client.name}</Text>
					<Text style={styles.closeButton} onPress={this.props.hide}>
						<FontAwesome name="close" size={35} />
					</Text>
				</View>
				<View style={styles.formContainer}>
					<View style={styles.inputRow}>
						<Text style={styles.formLabel}>Session Time</Text>
						{picker}
						{timePicker}
					</View>
					<View style={styles.inputRow}>
						<Text style={styles.formLabel}>Session Duration</Text>
						<Picker
							style={styles.picker}
							itemStyle={{ height: 70, color: COLORS.PRIMARY }}
							selectedValue={this.state.bookDuration}
							onValueChange={(itemValue, itemIndex) => this.setState({ bookDuration: itemValue })}>
							<Picker.Item label='1 hour' value='60' />
							<Picker.Item label='90 minutes' value='90' />
							<Picker.Item label='2 hours' value='120' />
						</Picker>
					</View>
					<TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookClient()}>
						<Text style={styles.buttonText}>
							Schedule Session
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		)
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
		width: '95%',
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