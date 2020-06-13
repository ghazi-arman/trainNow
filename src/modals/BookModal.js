import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, DatePickerAndroid, TimePickerAndroid, Picker, Image, Platform } from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import bugsnag from '@bugsnag/expo';
import { dateToString, timeOverlapCheck, loadPendingSchedule, sendMessage, loadUser, createPendingSession, loadAcceptedSchedule, loadTrainer } from '../components/Functions';
import COLORS from '../components/Colors';
import Constants from '../components/Constants';
const loading = require('../images/loading.gif');

export class BookModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookDate: new Date(),
      bookDuration: '60',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if(!this.state.trainer || !this.state.user){
      try {
        // Load trainer and user logged in
        const trainer = await loadTrainer(this.props.trainer.key);
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.setState({ trainer, user, bookDate: new Date(new Date().getTime() + trainer.offset * 60000) });
      } catch(error) {
        this.bugsnagClient.notify(error);
        this.props.hide();
        Alert.alert("There was an error loading this trainer. Please try again later.");
      }
    }
  }

  bookTrainer = async() => {
    // Prevent multiple form submits
    if (this.state.pressed) {
      return;
    }
    // Checks stripe account creation for both trainer and client
    if (!this.state.user.cardAdded) {
      Alert.alert('You must have a card on file to book a session.');
      return;
    }
    if (!this.state.trainer.cardAdded && this.state.trainer.trainerType === Constants.independentType) {
      Alert.alert('This trainer has not added a payment method yet.');
      return;
    }
    // checks if client is using trainer account and if trainer is active
    if (this.state.user.type === Constants.trainerType) {
      Alert.alert('Sign into a non-trainer account to book sessions.');
      return;
    }
    this.setState({ pressed: true });

    // Pulls schedules for trainers and conflicts to check for overlaps
    let user = firebase.auth().currentUser;    
    const trainerSchedule = await loadAcceptedSchedule(this.props.trainer.key);
    const pendingSchedule = await loadPendingSchedule(user.uid);
    let clientSchedule = await loadAcceptedSchedule(user.uid);
    clientSchedule = clientSchedule.concat(pendingSchedule);
    const endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));
    let timeConflict = false;

		trainerSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
        Alert.alert('The Trainer has a session during this time.');
        timeConflict = true;
			}
		});

		clientSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
        Alert.alert('You already have a pending session or session during this time.');
        timeConflict = true;
			}
    });

    if (timeConflict) {
      this.setState({ pressed: false });
      return;
    }
    
    // create session in pending table
    const price = (this.state.trainer.rate * (parseInt(this.state.bookDuration) / 60)).toFixed(2);
    let trainer = this.state.trainer;
    let client = this.state.user;
    client.key = firebase.auth().currentUser.uid;
    trainer.key = this.props.trainer.key;
    const trainerIsRegular = (await firebase.database().ref(`/users/${client.key}/trainers/${trainer.key}`).once('value')).val()
    const regular = trainerIsRegular ? true : false;
    Alert.alert(
      `Book Session`,
      `Request session with ${this.state.trainer.name} for $${price} at ${dateToString(this.state.bookDate)}`,
      [
        { 
          text: 'No', onPress: () => {
            this.setState({ pressed: false });
          } 
        },
        {
          text: 'Yes', onPress: async () => {
            createPendingSession(client, trainer, this.props.gym, this.state.bookDate, this.state.bookDuration, 'client', regular);
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

  openDatePicker = async() => {
    try {
      const {action, year, month, day} = await DatePickerAndroid.open({
        date: new Date(),
        minDate: new Date(new Date().getTime() + this.state.trainer.offset * 60000),
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
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        const date = new Date(this.state.bookDate.setHours(hour, minute));
        this.setState({ bookDate: date });
      }
    } catch ({code, message}) {
      console.warn('Cannot open time picker', message);
    }
  }

  render() {
    if (!this.state.trainer || !this.state.user || this.state.pressed) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }
    let picker, timePicker;
    if(Platform.OS === 'ios') {
			picker = (
				<DatePickerIOS
					mode='datetime'
					itemStyle={{ color: COLORS.PRIMARY }}
					textColor={COLORS.PRIMARY}
					style={styles.datePicker}
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
          <Text style={styles.backButton} onPress={this.props.hideandOpen}>
            <FontAwesome name="arrow-left" size={35} />
          </Text>
          <Text style={styles.trainerName}>{this.state.trainer.name}</Text>
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
              onValueChange={(itemValue) => this.setState({ bookDuration: itemValue })}
            >
              <Picker.Item label='1 hour' value='60' />
              <Picker.Item label='90 minutes' value='90' />
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
    flex: 0.95,
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
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.PRIMARY,
    marginBottom: 15,
  },
  formContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 6,
    width: '95%',
  },
  inputRow: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  picker: {
    height: 70,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  bookButton: {
    paddingVertical: 10,
    backgroundColor: COLORS.SECONDARY,
    width: '70%',
    borderRadius: 5
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700'
  },
  backButton: {
    position: 'absolute',
    left: 10,
    fontSize: 35,
    color: COLORS.SECONDARY,
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