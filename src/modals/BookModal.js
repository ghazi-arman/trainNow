import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, Picker } from 'react-native';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import bugsnag from '@bugsnag/expo';
import { dateToString, timeOverlapCheck, loadPendingSchedule, sendMessage, loadUser, createPendingSession, loadAcceptedSchedule, loadOtherTrainer } from '../components/Functions';
import COLORS from '../components/Colors';

export class BookModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      bookDate: new Date(),
      bookDuration: '60',
      submitted: false
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if(!this.state.trainer || !this.state.user){
      try {
        // Load trainer and user logged in
        const trainer = await loadOtherTrainer(this.props.trainer.key);
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.setState({trainer, user});
      } catch(error) {
        this.bugsnagClient.notify(error);
        this.props.hide();
        Alert.alert("There was an error loading this trainer. Please try again later.");
      }
    }
  }

  bookTrainer = async() => {
    // Prevent multiple form submits
    if (this.state.submitted) {
      return;
    }
    // Checks stripe account creation for both trainer and client
    if (!this.state.user.cardAdded) {
      Alert.alert('You must have a card on file to book a session.');
      return;
    }
    if (!this.state.trainer.cardAdded && !this.state.trainer.type == 'managed') {
      Alert.alert('This trainer has not added a payment method yet.');
      return;
    }
    // checks if client is using trainer account and if trainer is active
    if (this.state.user.trainer) {
      Alert.alert('Sign into a non-trainer account to book sessions.');
      return;
    }
    this.state.submitted = true;

    // Pulls schedules for trainers and conflicts to check for overlaps
    let user = firebase.auth().currentUser;    
    const trainerSchedule = await loadAcceptedSchedule(this.props.trainer.key);
    const pendingSchedule = await loadPendingSchedule(user.uid);
    let traineeSchedule = await loadAcceptedSchedule(user.uid);
    traineeSchedule = traineeSchedule.concat(pendingSchedule);
    const endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));
    let timeConflict = false;

		trainerSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
        Alert.alert('The Trainer has a session during this time.');
        timeConflict = true;
			}
		});

		traineeSchedule.forEach((currSession) => {
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
        Alert.alert('You already have a pending session or session during this time.');
        timeConflict = true;
			}
    });

    if (timeConflict) {
      this.state.submitted = false;
      return;
    }
    
    // create session in pending table
    const price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);
    let trainer = this.state.trainer;
    let trainee = this.state.user;
    trainee.uid = firebase.auth().currentUser.uid;
    trainer.key = this.props.trainer.key;
    Alert.alert(
      `Book Session`,
      `Request session with ${this.state.trainer.name} for $${price} at ${dateToString(this.state.bookDate)}`,
      [
        { 
          text: 'No', onPress: () => {
            this.state.submitted = false;
          } 
        },
        {
          text: 'Yes', onPress: async () => {
            createPendingSession(trainee, trainer, this.props.gym, this.state.bookDate, this.state.bookDuration, 'trainee', false);
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
    if (!this.state.trainer || !this.state.user) {
      return <AppLoading />
    }
    return (
      <View style={styles.modal}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.props.hideandOpen}>
            <FontAwesome>{Icons.arrowLeft}</FontAwesome>
          </Text>
          <Text style={styles.trainerName}>{this.state.trainer.name}</Text>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.inputRow}>
            <Text style={styles.formLabel}>Session Time</Text>
            <DatePickerIOS
              mode='datetime'
              itemStyle={{ color: COLORS.PRIMARY }}
              textColor={COLORS.PRIMARY}
              style={styles.datePicker}
              minuteInterval={5}
              minimumDate={new Date(new Date().getTime())}
              date={this.state.bookDate}
              onDateChange={(bookDate) => this.setState({ bookDate: bookDate })}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.formLabel}>Session Duration</Text>
            <Picker
              style={styles.picker}
              itemStyle={{ height: 70, color: COLORS.PRIMARY }}
              selectedValue={this.state.bookDuration}
              onValueChange={(itemValue, itemIndex) => this.setState({ bookDuration: itemValue })}
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
  }
})