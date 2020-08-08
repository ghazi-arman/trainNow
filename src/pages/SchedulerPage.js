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
import CommonStyles from '../components/CommonStyles';

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
          style={CommonStyles.fullButton}
          onPressIn={() => this.openDatePicker(true)}
        >
          <Text style={CommonStyles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      startTimePicker = (
        <TouchableOpacity
          style={[CommonStyles.fullButton, { marginTop: 20 }]}
          onPressIn={() => this.openTimePicker(true)}
        >
          <Text style={CommonStyles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
      endPicker = (
        <TouchableOpacity
          style={CommonStyles.fullButton}
          onPressIn={() => this.openDatePicker(false)}
        >
          <Text style={CommonStyles.buttonText}>
            Choose Date
          </Text>
        </TouchableOpacity>
      );
      endTimePicker = (
        <TouchableOpacity
          style={[CommonStyles.fullButton, { marginTop: 20 }]}
          onPressIn={() => this.openTimePicker(false)}
        >
          <Text style={CommonStyles.buttonText}>
            Choose Time
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton />
        <Text style={styles.title}>Add Availability</Text>
        <View style={styles.formContainer}>
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
            style={CommonStyles.fullButton}
            onPressIn={() => this.addSession(this.state.startDate, this.state.endDate)}
          >
            <Text style={CommonStyles.buttonText}> Add Availability</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.flexStartContainer,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 25,
    marginHorizontal: 15,
    fontWeight: '500',
  },
  formContainer: {
    height: '85%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 20,
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
    marginHorizontal: 15,
    marginBottom: 5,
  },
  datepicker: {
    height: 200,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Primary,
  },
});
