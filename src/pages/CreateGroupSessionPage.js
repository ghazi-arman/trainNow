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
  Picker,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  loadUser, createGroupSession, loadGroupSession, updateGroupSession,
} from '../components/Functions';
import TextField from '../components/TextField';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

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
            gymKey: session.gymKey,
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
        this.state.gymKey,
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
        return;
      }
      if (!this.state.gymKey || this.state.gymKey === 'none') {
        Alert.alert('Please select a gym');
        return;
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
        this.state.gymKey,
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
          itemStyle={{ color: Colors.Primary }}
          textColor={Colors.Primary}
          style={styles.datePicker}
          minuteInterval={5}
          minimumDate={minimumDate}
          date={this.state.start}
          onDateChange={(date) => this.setState({ start: date })}
        />
      );
    } else {
      startDatePicker = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPressIn={() => this.openDatePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Session Date
          </Text>
        </TouchableOpacity>
      );
      startTimePicker = (
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }, MasterStyles.shadow]}
          onPress={() => this.openTimePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Session Time
          </Text>
        </TouchableOpacity>
      );
    }
    let button;
    if (this.props.sessionKey) {
      button = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPress={this.updateSession}
        >
          <Text style={styles.buttonText}> Update Session </Text>
        </TouchableOpacity>
      );
    } else {
      button = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPress={this.createSession}
        >
          <Text style={styles.buttonText}> Create Session </Text>
        </TouchableOpacity>
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.center}>
          <BackButton style={{ marginHorizontal: 5 }} />
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
          <Text style={styles.formLabel}>Gym</Text>
          <Picker
            style={styles.picker}
            itemStyle={{ height: 45, color: Colors.Primary }}
            selectedValue={this.state.gymKey}
            onValueChange={(itemValue) => this.setState({ gymKey: itemValue })}
          >
            <Picker.Item label="Pick a Gym (Scroll)" value="none" key="0" />
            {Object.keys(this.state.user.gyms).map(
              (key) => {
                const gym = this.state.user.gyms[key];
                return (
                  <Picker.Item label={gym.name} value={key} key={key} />
                );
              },
            )}
          </Picker>
          <Text style={styles.formLabel}>Start Time</Text>
          <View style={styles.buttonContainer}>
            {startDatePicker}
            {startTimePicker}
            {button}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  formContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    borderRadius: 10,
    width: '80%',
    height: 50,
    marginTop: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.Primary,
    paddingBottom: 10,
    margin: 5,
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: Colors.Primary,
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Primary,
  },
  picker: {
    height: 45,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Primary,
    width: '100%',
    marginBottom: 10,
  },
});
