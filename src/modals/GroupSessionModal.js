import React, { Component } from 'react';
import { StyleSheet, Text, View, DatePickerIOS, DatePickerAndroid, TouchableOpacity, Alert, ScrollView, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadUser, createGroupSession, loadGroupSession, updateGroupSession } from '../components/Functions';
import TextField from '../components/TextField';
const loading = require('../images/loading.gif');

export class GroupSessionModal extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      start: new Date(),
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount(){
    // load user info
    if(!this.state.user){
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        if(this.props.sessionKey) {
          session = await loadGroupSession(this.props.sessionKey);
          this.setState({ 
            user, 
            session,
            start: new Date(session.start),
            duration: session.duration,
            name: session.name,
            bio: session.bio,
            capacity: session.capacity
          });
        } else {
          this.setState({ user });
        }
      } catch(error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the modal.');
        this.props.hide();
      }
    }
  }
  
  openDatePicker = async(start) => {
    try {
      let minimumDate = new Date() < this.state.start ? new Date() : this.state.start;
      const {action, year, month, day} = await DatePickerAndroid.open({
        date: this.state.start,
        minDate: minimumDate
      });
      if (action !== DatePickerAndroid.dismissedAction) {
        this.setState({ start: new Date(year, month, day)});
      }
    } catch (error) {
      this.bugsnagClient.notify(error);
    }
  }

  openTimePicker = async(start) => {
    try {
      const {action, hour, minute} = await TimePickerAndroid.open({
        hour: 0,
        minute: 0,
        is24Hour: false,
      });
      if (action !== TimePickerAndroid.dismissedAction) {
        const date = this.state.start;
        this.setState({ start: date.setHours(hour, minute)});
      }
    } catch ({code, message}) {
      console.warn('Cannot open time picker', message);
    }
  }
  
  createSession = async() => {
    try {
      if (!this.state.duration || this.state.duration.replace(/\D/g,'') < 30) {
        Alert.alert("Please enter a duration greater than 30 minutes.");
        return;
      }
      if (!this.state.capacity || this.state.capacity.replace(/\D/g,'') < 2) {
        Alert.alert("Please enter a capacity greater than 1.");
        return;
      }
      if (!this.state.bio) {
        Alert.alert("Please enter a session description");
        return;
      }
      if (!this.state.name) {
        Alert.alert("Please enter a session name");
      }
      await createGroupSession(
        this.state.user,
        this.state.start,
        this.state.duration,
        this.state.name,
        this.state.bio,
        this.state.capacity
      );
      this.props.hideAndConfirm();
    } catch(error) {
      Alert.alert('There was an error when trying to create the session.');
    }
  }

  updateSession = async() => {
    try {
      if (this.state.session.clientCount > 0 &&
        (this.state.session.start != this.state.start.toString() || this.state.session.duration != this.state.duration)) {
        Alert.alert('You cannot change the time or duration after someone has joined. Please cancel to change the time or duration.');
        return;
      }
      if (this.state.session.clientCount > 0 && this.state.session.rate !== this.state.user.rate) {
        Alert.alert('You cannot change your rate after someone has already joined. Please delete the session to change the rate.');
        return;
      }
      if (!this.state.duration || this.state.duration.replace(/\D/g,'') < 30) {
        Alert.alert("Please enter a duration greater than 30 minutes.");
        return;
      }
      if (!this.state.capacity || this.state.capacity.replace(/\D/g,'') < 2) {
        Alert.alert("Please enter a capacity greater than 1.");
        return;
      }
      if (!this.state.bio) {
        Alert.alert("Please enter a session description");
        return;
      }
      if (!this.state.name) {
        Alert.alert("Please enter a session name");
      }
      await updateGroupSession(
        this.state.user,
        this.state.session,
        this.state.start,
        this.state.duration,
        this.state.name,
        this.state.bio,
        this.state.capacity
      );
      this.props.hideAndConfirm();
    } catch(error) {
      Alert.alert('There was an error when trying to update the session.');
    }
  }

  render(){
    if(!this.state.user){
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }
    let startDatePicker, startTimePicker;
    if(Platform.OS === 'ios') {
      let minimumDate = new Date() < this.state.start ? new Date() : this.state.start;
      startTimePicker = (
        <DatePickerIOS
          mode='datetime'
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
        <TouchableOpacity style={styles.bookButton} onPressIn={() => this.openDatePicker(true)}>
          <Text style={styles.buttonText}>
            Choose Session Date
          </Text>
        </TouchableOpacity>
      );
      startTimePicker = (
        <TouchableOpacity style={[styles.bookButton, {marginTop: 20}]} onPressIn={() => this.openTimePicker(true)}>
          <Text style={styles.buttonText}>
            Choose Session Time
          </Text>
        </TouchableOpacity>
      );
    }
    let actionButton
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
    return(
      <View style={styles.modal}>
        <View style={styles.nameContainer}>
          <Text style={styles.trainerName}>Create Group Session</Text>
          <Text style={styles.closeButton} onPress={this.props.hide}>
            <FontAwesome name="close" size={35} />
          </Text>
        </View>
        <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
          <ScrollView style={{ width: '90%' }} contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
            <View style={[styles.inputRow, {paddingTop: 10}]}>
              <TextField 
                icon="vcard"
                placeholder="Session Name (limit to a few words)"
                onChange={(name) => this.setState({ name })}
                value={this.state.name}
              />
              <TextField 
                icon="info"
                multiline={true}
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
    fontWeight: '500'
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
    backgroundColor: COLORS.SECONDARY,
    width: '70%',
    marginTop: 10
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
    paddingBottom: 10
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  datepicker: {
    height: 200,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
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