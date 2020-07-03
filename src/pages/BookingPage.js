import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  DatePickerIOS,
  DatePickerAndroid,
  TimePickerAndroid,
  Picker,
  Platform,
} from 'react-native';
import firebase from 'firebase';
import PropTypes from 'prop-types';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import {
  dateToString,
  timeOverlapCheck,
  loadPendingSchedule,
  sendMessage,
  loadUser,
  createPendingSession,
  loadAcceptedSchedule,
  loadTrainer,
  loadClient,
} from '../components/Functions';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class BookingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookDate: new Date(),
      bookDuration: '60',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.trainer || !this.state.client) {
      try {
        // Load trainer and user logged in
        const trainer = this.props.bookedBy === Constants.trainerType
          ? await loadUser(this.props.trainerKey)
          : await loadTrainer(this.props.trainerKey);
        const client = this.props.bookedBy === Constants.clientType
          ? await loadUser(this.props.clientKey)
          : await loadClient(this.props.clientKey);
        this.setState({
          trainer,
          client,
          bookDate: new Date(new Date().getTime() + trainer.offset * 60000),
        });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Actions.GymPage({ gymKey: this.props.gymKey });
        Alert.alert('There was an error loading this trainer. Please try again later.');
      }
    }
  }

  bookTrainer = async () => {
    // Prevent multiple form submits
    if (this.state.pressed) {
      return;
    }
    // Checks stripe account creation for both trainer and client
    if (!this.state.client.cardAdded) {
      Alert.alert('You must have a card on file to book a session.');
      return;
    }
    if (
      !this.state.trainer.cardAdded
      && this.state.trainer.trainerType === Constants.independentType
    ) {
      Alert.alert('This trainer has not added a payment method yet.');
      return;
    }
    // checks if client is using trainer account and if trainer is active
    if (this.state.client.type === Constants.trainerType) {
      Alert.alert('Sign into a non-trainer account to book sessions.');
      return;
    }
    this.setState({ pressed: true });

    // Pulls schedules for trainers and conflicts to check for overlaps
    const trainerSchedule = await loadAcceptedSchedule(this.props.trainerKey);
    let clientSchedule = await loadAcceptedSchedule(this.props.clientKey);
    let pendingSchedule;
    if (this.props.bookedBy === Constants.trainerType) {
      pendingSchedule = await loadPendingSchedule(this.props.trainerKey);
    } else {
      pendingSchedule = await loadPendingSchedule(this.props.clientKey);
    }
    clientSchedule = clientSchedule.concat(pendingSchedule);
    const bookDurationMs = 60000 * this.state.bookDuration;
    const endTime = new Date(new Date(this.state.bookDate).getTime() + bookDurationMs);
    let timeConflict = false;

    trainerSchedule.forEach((currSession) => {
      if (timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)) {
        Alert.alert('The Trainer has a session during this time.');
        timeConflict = true;
      }
    });

    clientSchedule.forEach((currSession) => {
      if (timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)) {
        Alert.alert('You already have a pending session or session during this time.');
        timeConflict = true;
      }
    });

    if (timeConflict) {
      this.setState({ pressed: false });
      return;
    }

    // create session in pending table
    const minutesTrained = parseInt(this.state.bookDuration, 10) / 60;
    const price = (this.state.trainer.rate * minutesTrained).toFixed(2);
    const { trainer } = this.state;
    const { client } = this.state;
    const trainerIsRegular = (await firebase.database().ref(`/users/${client.key}/trainers/${trainer.key}`)
      .once('value'))
      .val();
    const regular = trainerIsRegular !== null;
    Alert.alert(
      'Book Session',
      `Request session with ${this.state.trainer.name} for $${price} at ${dateToString(this.state.bookDate)}`,
      [
        {
          text: 'No',
          onPress: () => {
            this.setState({ pressed: false });
          },
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              createPendingSession(
                client,
                trainer,
                this.props.gymKey,
                this.state.bookDate,
                this.state.bookDuration,
                this.props.bookedBy,
                regular,
              );
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error when trying to create the session.');
              return;
            }
            try {
              const message = `${this.state.client.name} has requested a session at ${dateToString(this.state.bookDate)} for ${this.state.bookDuration} mins.`;
              sendMessage(this.state.trainer.phone, message);
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error sending a notification text to the trainer.');
              return;
            }
            Alert.alert('Session successfully booked.');
            Actions.MapPage();
          },
        },
      ],
    );
  }

  openDatePicker = async () => {
    try {
      const {
        action, year, month, day,
      } = await DatePickerAndroid.open({
        date: new Date(),
        minDate: new Date(new Date().getTime() + this.state.trainer.offset * 60000),
      });
      if (action !== DatePickerAndroid.dismissedAction) {
        this.setState({ bookDate: new Date(year, month, day) });
      }
    } catch (error) {
      this.bugsnagClient.notify(error);
    }
  }

  openTimePicker = async () => {
    try {
      const { action, hour, minute } = await TimePickerAndroid.open({
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        // eslint-disable-next-line
        const bookDate = new Date(this.state.bookDate.setHours(hour, minute));
        this.setState({ bookDate });
      }
    } catch ({ code, message }) {
      this.bugsnagClient.notify(message);
    }
  }

  render() {
    if (!this.state.trainer || !this.state.client || this.state.pressed) {
      return <LoadingWheel />;
    }
    let picker;
    let timePicker;
    if (Platform.OS === 'ios') {
      picker = (
        <DatePickerIOS
          mode="datetime"
          itemStyle={{ color: Colors.Primary }}
          textColor={Colors.Primary}
          style={styles.datePicker}
          minuteInterval={5}
          minimumDate={new Date(new Date().getTime() + this.state.trainer.offset * 60000)}
          date={this.state.bookDate}
          onDateChange={(bookDate) => this.setState({ bookDate })}
        />
      );
    } else {
      picker = (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => this.openDatePicker()}
        >
          <Text style={styles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      timePicker = (
        <TouchableOpacity
          style={[styles.bookButton, { marginTop: 20 }]}
          onPress={() => this.openTimePicker()}
        >
          <Text style={styles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
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
              itemStyle={{ height: 70, color: Colors.Primary }}
              selectedValue={this.state.bookDuration}
              onValueChange={(itemValue) => this.setState({ bookDuration: itemValue })}
            >
              <Picker.Item label="1 hour" value="60" />
              <Picker.Item label="90 minutes" value="90" />
              <Picker.Item label="2 hours" value="120" />
            </Picker>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={() => this.bookTrainer()}>
            <Text style={styles.buttonText}>
              Schedule Session
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

BookingPage.propTypes = {
  clientKey: PropTypes.string.isRequired,
  trainerKey: PropTypes.string.isRequired,
  gymKey: PropTypes.string.isRequired,
  bookedBy: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  trainerName: {
    fontSize: 30,
    color: Colors.White,
    fontWeight: '500',
    textAlign: 'center',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.Primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.Primary,
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
    borderColor: Colors.Primary,
  },
  picker: {
    height: 70,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.Primary,
  },
  bookButton: {
    paddingVertical: 15,
    backgroundColor: Colors.Secondary,
    width: '80%',
    borderRadius: 5,
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.White,
    fontSize: 20,
    fontWeight: '700',
  },
});
