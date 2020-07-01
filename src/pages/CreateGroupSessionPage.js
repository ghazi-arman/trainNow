import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  DatePickerIOS,
  DatePickerAndroid,
  TimePickerAndroid,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
import {
  loadUser, createGroupSession, loadGroupSession, updateGroupSession,
} from '../components/Functions';
import TextField from '../components/TextField';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';

export default class CreateGroupSessionPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      start: new Date(),
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    // load user info
    if (!this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        if (this.props.sessionKey) {
          const session = await loadGroupSession(this.props.sessionKey);
          this.setState({
            user,
            session,
            start: new Date(session.start),
            duration: session.duration,
            name: session.name,
            bio: session.bio,
            capacity: session.capacity,
            cost: String(session.cost),
          });
        } else {
          this.setState({ user });
        }
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the page.');
        Actions.CalendarPage();
      }
    }
  }

  openDatePicker = async () => {
    try {
      const minimumDate = new Date() < this.state.start ? new Date() : this.state.start;
      const {
        action, year, month, day,
      } = await DatePickerAndroid.open({
        date: this.state.start,
        minDate: minimumDate,
      });
      if (action !== DatePickerAndroid.dismissedAction) {
        this.setState({ start: new Date(year, month, day) });
      }
    } catch (error) {
      this.bugsnagClient.notify(error);
    }
  }

  openTimePicker = async () => {
    try {
      const { action, hour, minute } = await TimePickerAndroid.open({
        hour: 0,
        minute: 0,
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        const { start } = this.state;
        this.setState({ start: start.setHours(hour, minute) });
      }
    } catch ({ code, message }) {
      this.bugsnagClient.notify(message);
    }
  }

  createSession = async () => {
    try {
      if (!this.state.duration || parseInt(this.state.duration, 10) < 30) {
        Alert.alert('Please enter a duration greater than 30 minutes.');
        return;
      }
      if (!this.state.capacity || parseInt(this.state.capacity, 10) < 2) {
        Alert.alert('Please enter a capacity greater than 1.');
        return;
      }
      if (!this.state.bio) {
        Alert.alert('Please enter a session description');
        return;
      }
      if (!this.state.name) {
        Alert.alert('Please enter a session name');
      }
      await createGroupSession(
        this.state.user,
        this.state.start,
        this.state.duration,
        this.state.name,
        this.state.bio,
        this.state.capacity,
        this.state.cost,
      );
      Alert.alert('Session successfully created.');
      Actions.CalendarPage();
    } catch (error) {
      Alert.alert('There was an error when trying to create the session.');
    }
  }

  updateSession = async () => {
    try {
      if (this.state.session.clientCount > 0
        && (
          this.state.session.start !== this.state.start.toString()
          || this.state.session.duration !== this.state.duration
        )
      ) {
        Alert.alert('You cannot change the time or duration after someone has joined. Please cancel to change the time or duration.');
        return;
      }
      if (
        this.state.session.clientCount > 0
        && this.state.session.cost !== parseInt(this.state.cost, 10)
      ) {
        Alert.alert('You cannot change your cost after someone has already joined. Please delete the session to change the cost.');
        return;
      }
      if (!this.state.duration || parseInt(this.state.duration, 10) < 30) {
        Alert.alert('Please enter a duration greater than 30 minutes.');
        return;
      }
      if (!this.state.capacity || parseInt(this.state.capacity, 10) < 2) {
        Alert.alert('Please enter a capacity greater than 1.');
        return;
      }
      if (!this.state.cost || parseInt(this.state.cost, 10) < 10) {
        Alert.alert('Please enter a cost greater than $10.');
        return;
      }
      if (!this.state.bio) {
        Alert.alert('Please enter a session description');
        return;
      }
      if (!this.state.name) {
        Alert.alert('Please enter a session name');
      }
      await updateGroupSession(
        this.state.user,
        this.state.session,
        this.state.start,
        this.state.duration,
        this.state.name,
        this.state.bio,
        this.state.capacity,
        this.state.cost,
      );
      Alert.alert('Session successfully updated.');
      Actions.CalendarPage();
    } catch (error) {
      Alert.alert('There was an error when trying to update the session.');
    }
  }

  render() {
    if (!this.state.user) {
      return <LoadingWheel />;
    }
    let startDatePicker;
    let startTimePicker;
    if (Platform.OS === 'ios') {
      const minimumDate = new Date() < this.state.start ? new Date() : this.state.start;
      startTimePicker = (
        <DatePickerIOS
          mode="datetime"
          itemStyle={{ color: COLORS.PRIMARY }}
          textColor={COLORS.PRIMARY}
          style={styles.datepicker}
          minuteInterval={5}
          minimumDate={minimumDate}
          date={this.state.start}
          onDateChange={(date) => this.setState({ start: date })}
        />
      );
    } else {
      startDatePicker = (
        <TouchableOpacity
          style={styles.bookButton}
          onPressIn={() => this.openDatePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Session Date
          </Text>
        </TouchableOpacity>
      );
      startTimePicker = (
        <TouchableOpacity
          style={[styles.bookButton, { marginTop: 20 }]}
          onPress={() => this.openTimePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Session Time
          </Text>
        </TouchableOpacity>
      );
    }
    let actionButton;
    if (this.props.sessionKey) {
      actionButton = (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={this.updateSession}
        >
          <Text style={styles.buttonText}> Update Session </Text>
        </TouchableOpacity>
      );
    } else {
      actionButton = (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={this.createSession}
        >
          <Text style={styles.buttonText}> Create Session </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.trainerName}>Group Session</Text>
          <BackButton />
        </View>
        <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
          <ScrollView
            style={{ width: '90%' }}
            contentContainerStyle={styles.center}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.inputRow, { paddingTop: 10 }]}>
              <TextField
                icon="vcard"
                placeholder="Session Name (limit to a few words)"
                onChange={(name) => this.setState({ name })}
                value={this.state.name}
              />
              <TextField
                icon="info"
                multiline
                placeholder="Enter session description (type, exercises, etc.)"
                onChange={(bio) => this.setState({ bio })}
                value={this.state.bio}
              />
              <TextField
                icon="user"
                placeholder="Maximum Capacity"
                keyboard="number-pad"
                onChange={(capacity) => this.setState({ capacity })}
                value={this.state.capacity}
              />
              <TextField
                icon="clock-o"
                placeholder="Duration (Minutes)"
                keyboard="number-pad"
                onChange={(duration) => this.setState({ duration })}
                value={this.state.duration}
              />
              <TextField
                icon="dollar"
                placeholder="Cost"
                keyboard="number-pad"
                onChange={(cost) => this.setState({ cost })}
                value={this.state.cost}
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.formLabel}>Start Time</Text>
              {startDatePicker}
              {startTimePicker}
            </View>
            {actionButton}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
}

CreateGroupSessionPage.propTypes = {
  sessionKey: PropTypes.string,
};

CreateGroupSessionPage.defaultProps = {
  sessionKey: null,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  trainerName: {
    fontSize: 30,
    color: COLORS.WHITE,
    fontWeight: '500',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    flex: 6,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  center: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  bookButton: {
    borderRadius: 5,
    paddingVertical: 15,
    backgroundColor: COLORS.SECONDARY,
    width: '80%',
    marginTop: 10,
  },
  inputRow: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: COLORS.PRIMARY,
    paddingBottom: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  datepicker: {
    height: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
});
