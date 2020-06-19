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
  Image,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadUser, addAvailableSession } from '../components/Functions';

const loading = require('../images/loading.gif');

export default class SchedulerModal extends Component {
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
        this.props.hide();
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

  addSession(startDate, endDate) {
    addAvailableSession(this.props.trainerKey, startDate, endDate);
    this.props.hideandConfirm();
  }

  render() {
    if (!this.state.user) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }
    let startPicker;
    let endPicker;
    let startTimePicker;
    let endTimePicker;
    if (Platform.OS === 'ios') {
      startPicker = (
        <DatePickerIOS
          mode="datetime"
          itemStyle={{ color: COLORS.PRIMARY }}
          textColor={COLORS.PRIMARY}
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
          itemStyle={{ color: COLORS.PRIMARY }}
          textColor={COLORS.PRIMARY}
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
      <View style={styles.modal}>
        <View style={styles.nameContainer}>
          <Text style={styles.trainerName}>Add Availability</Text>
          <Text style={styles.closeButton} onPress={this.props.hide}>
            <FontAwesome name="close" size={35} />
          </Text>
        </View>
        <View style={styles.formContainer}>
          <ScrollView
            style={{ width: '90%' }}
            contentContainerStyle={styles.center}
            showsVerticalScrollIndicator={false}
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
              style={styles.bookButton}
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

SchedulerModal.propTypes = {
  hide: PropTypes.func.isRequired,
  trainerKey: PropTypes.string.isRequired,
  hideandConfirm: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  modal: {
    flex: 0.9,
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
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 35,
    color: COLORS.RED,
  },
  bookButton: {
    paddingVertical: 15,
    borderRadius: 5,
    backgroundColor: COLORS.SECONDARY,
    width: '80%',
    marginTop: 10,
  },
  inputRow: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
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
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
