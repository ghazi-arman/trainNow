import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  DatePickerIOS,
  DatePickerAndroid,
  TouchableOpacity,
  TimePickerAndroid,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import { loadUser, addAvailableSession } from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class SchedulerPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      startDate: new Date(),
      endDate: new Date(),
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    // load user info
    if (!this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.setState({ user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the scheduler.');
        Actions.CalendarPage();
      }
    }
  }

  openDatePicker = async (start) => {
    try {
      const {
        action, year, month, day,
      } = await DatePickerAndroid.open({
        date: new Date(),
        minDate: new Date(),
      });
      if (action !== DatePickerAndroid.dismissedAction) {
        if (start) {
          this.setState({ startDate: new Date(year, month, day) });
        } else {
          this.setState({ endDate: new Date(year, month, day) });
        }
      }
    } catch (error) {
      this.bugsnagClient.notify(error);
    }
  }

  openTimePicker = async (start) => {
    try {
      const { action, hour, minute } = await TimePickerAndroid.open({
        hour: 0,
        minute: 0,
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        if (start) {
          const { startDate } = this.state;
          this.setState({ startDate: startDate.setHours(hour, minute) });
        } else {
          const { endDate } = this.state;
          this.setState({ endDate: endDate.setHours(hour, minute) });
        }
      }
    } catch ({ code, message }) {
      this.bugsnagClient.notify(message);
    }
  }

  addSession = (startDate, endDate) => {
    addAvailableSession(firebase.auth().currentUser.uid, startDate, endDate);
    Alert.alert('Availability added.');
    Actions.CalendarPage();
  }

  render() {
    if (!this.state.user) {
      return <LoadingWheel />;
    }
    let startPicker;
    let endPicker;
    let startTimePicker;
    let endTimePicker;
    if (Platform.OS === 'ios') {
      startPicker = (
        <DatePickerIOS
          mode="datetime"
          itemStyle={{ color: Colors.Primary }}
          textColor={Colors.Primary}
          style={styles.datepicker}
          minuteInterval={5}
          minimumDate={new Date()}
          date={this.state.startDate}
          onDateChange={(date) => this.setState({ startDate: date })}
        />
      );
      endPicker = (
        <DatePickerIOS
          mode="datetime"
          itemStyle={{ color: Colors.Primary }}
          textColor={Colors.Primary}
          style={styles.datepicker}
          minuteInterval={5}
          minimumDate={new Date()}
          date={this.state.endDate}
          onDateChange={(date) => this.setState({ endDate: date })}
        />
      );
    } else {
      startPicker = (
        <TouchableOpacity
          style={styles.bookButton}
          onPressIn={() => this.openDatePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      startTimePicker = (
        <TouchableOpacity
          style={[styles.bookButton, { marginTop: 20 }]}
          onPressIn={() => this.openTimePicker(true)}
        >
          <Text style={styles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
      endPicker = (
        <TouchableOpacity
          style={styles.bookButton}
          onPressIn={() => this.openDatePicker(false)}
        >
          <Text style={styles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      endTimePicker = (
        <TouchableOpacity
          style={[styles.bookButton, { marginTop: 20 }]}
          onPressIn={() => this.openTimePicker(false)}
        >
          <Text style={styles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[MasterStyles.flexStartContainer, { flex: null }]}>
        <View style={styles.nameContainer}>
          <BackButton style={styles.backButton} />
          <Text style={styles.header}>Add Availability</Text>
        </View>
        <View style={styles.formContainer}>
          <ScrollView
            style={{ width: '100%' }}
            contentContainerStyle={styles.center}
          >
            <View style={styles.inputRow}>
              <Text style={styles.formLabel}>Start Time</Text>
              {startPicker}
              {startTimePicker}
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.formLabel}>End Time</Text>
              {endPicker}
              {endTimePicker}
            </View>
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPressIn={() => this.addSession(this.state.startDate, this.state.endDate)}
            >
              <Text style={styles.buttonText}> Add Availability</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    fontSize: 25,
    color: Colors.LightGray,
    fontWeight: '500',
  },
  nameContainer: {
    height: '15%',
    width: '100%',
    backgroundColor: Colors.Primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
  },
  formContainer: {
    height: '85%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
  },
  center: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 10,
    width: '80%',
    height: 50,
    margin: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 10,
  },
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.Primary,
    margin: 10,
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
    color: Colors.Primary,
    fontWeight: '600',
  },
  datepicker: {
    height: 200,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Primary,
  },
});
