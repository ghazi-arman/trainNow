import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, Picker } from 'react-native';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import { dateToString } from './Functions';
import COLORS from './Colors';

export class BookModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      trainer: 'null',
      bookDate: new Date(),
      bookDuration: '60',
      user: 'null',
    };
    
    this.bookTrainer = this.bookTrainer.bind(this);
    this.loadTrainer = this.loadTrainer.bind(this);
  }

  componentDidMount() {
    this.loadTrainer(this.props.trainer.key);

    // Gets user info for state
    let user = firebase.auth().currentUser;
    let usersRef = firebase.database().ref('users');
    usersRef.orderByKey().equalTo(user.uid).on('child_added', function (snapshot) {
      this.setState({ user: snapshot.val() });
    }.bind(this));
  }

  // Loads selected trainer Info from db to state
  loadTrainer(trainerKey) {
    firebase.database().ref('/users/' + trainerKey).once('value', function (snapshot) {
      let trainer = snapshot.val();
      trainer.key = snapshot.key;
      this.setState({
        trainer: trainer
      });
    }.bind(this));
  }

  // Books session with trainer
  async bookTrainer() {

    // checks stripe account creation for both trainer and client
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
    if (this.state.trainer.active == false) {
      Alert.alert('Sorry, this trainer is no longer active.');
      return;
    }

    var user = firebase.auth().currentUser;
    var pendingRef = firebase.database().ref('pendingSessions');
    var trainRef = firebase.database().ref('trainSessions');
    
    // Pulls sessions for trainer to be booked and trainee to check for time conflicts
    // TODO: Change this logic to check for conflicts using traienr's / client's schedule objects in users table
    var sessions = [];
    const trainerSessions = await trainRef.orderByChild('trainer').equalTo(this.props.trainer.key).once('value', function (snapshot) {
      snapshot.forEach(function (child) {
        sessions.push(child.val());
      });
    }.bind(this));

    const userSessions = await trainRef.orderByChild('trainee').equalTo(user.uid).once('value', function (snapshot) {
      snapshot.forEach(function (child) {
        sessions.push(child.val());
      });
    });

    // Checks for time conflicts comparing all potential sessions to session to be booked time block
    // TODO: Change this to match above TODO's logic
    for (i = 0; i < sessions.length; i++) {
      let session = sessions[i];
      let start2 = new Date(session.start).getTime();
      let end2 = new Date(new Date(session.start).getTime() + (60000 * session.duration)).getTime();
      let start1 = new Date(this.state.bookDate).getTime();
      let end1 = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration)).getTime();

      if (start1 > start2 && start1 < end2 || start2 > start1 && start2 < end1) {
        if (session.trainee == user.uid) {
          Alert.alert('You have a session at ' + dateToString(session.start) + ' for ' + session.duration + ' mins.');
          return;
        } else {
          Alert.alert(this.state.trainer.name + ' has a session at ' + dateToString(session.start) + ' for ' + session.duration + ' mins.');
          return;
        }
      }
    }

    let price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);

    Alert.alert(
      'Request session with ' + this.state.trainer.name + ' for $' + price + ' at ' + dateToString(this.state.bookDate),
      '',
      [
        { text: 'No' },
        {
          text: 'Yes', onPress: async () => {
            pendingRef.push({
              trainee: user.uid,
              traineeName: this.state.user.name,
              trainer: this.props.trainer.key,
              trainerName: this.state.trainer.name,
              start: this.state.bookDate.toString(),
              duration: this.state.bookDuration,
              location: this.props.gym.location,
              gym: this.props.gym.name,
              rate: this.state.trainer.rate,
              read: false,
              traineeStripe: this.state.user.stripeId,
              trainerStripe: this.state.trainer.stripeId,
              traineePhone: this.state.user.phone,
              trainerPhone: this.state.trainer.phone,
              sentBy: 'trainee'
            });
            var scheduleKey = firebase.database().ref('users/' + user.uid + '/pendingschedule/' + this.props.trainerKey).push().key;
            try {
              let message = this.state.user.name + " has requested a session at " + dateToString(this.state.bookDate) + " for " + this.state.bookDuration + " mins.";
              const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
                method: 'POST',
                body: JSON.stringify({
                  phone: this.state.trainer.phone,
                  message: message
                }),
              });
              const data = await res.json();
              data.body = JSON.parse(data.body);
            } catch (error) {
              console.log(error);
              Alert.alert('There was an error sending a notification text to the trainer.');
            }
            this.props.hide();
            setTimeout(this.props.confirm, 1000);
          }
        }
      ]
    );
  }

  render() {
    if (this.state.trainer == 'null' || typeof this.state.trainer == undefined) {
      return <Expo.AppLoading />
    } else {
      return (
        <View style={styles.modal}>
          <View style={styles.nameContainer}>
            <Text style={styles.trainerName}>{this.state.trainer.name}</Text>
          </View>
          <Text style={styles.backButton} onPress={this.props.hideandOpen}>
            <FontAwesome>{Icons.arrowLeft}</FontAwesome>
          </Text>
          <View style={styles.formContainer}>
            <View style={styles.inputRow}>
              <Text style={styles.bookFormLabel}>Session Time</Text>
              <View style={styles.datePickerHolder}>
                <DatePickerIOS
                  mode='time'
                  itemStyle={{ color: COLORS.PRIMARY }}
                  textColor={COLORS.PRIMARY}
                  style={styles.datepicker}
                  minuteInterval={5}
                  minimumDate={new Date(new Date().getTime())}
                  date={this.state.bookDate}
                  onDateChange={(bookDate) => this.setState({ bookDate: bookDate })}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.bookFormLabel}>Session Duration</Text>
              <Picker
                style={styles.picker}
                itemStyle={{ height: 70, color: COLORS.PRIMARY }}
                selectedValue={this.state.bookDuration}
                onValueChange={(itemValue, itemIndex) => this.setState({ bookDuration: itemValue })}>
                <Picker.Item label='60' value='60' />
                <Picker.Item label='90' value='90' />
                <Picker.Item label='120' value='120' />
              </Picker>
            </View>
            <TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookTrainer()}>
              <Text style={styles.buttonText}>
                Schedule Session
              </Text>
            </TouchableOpacity>
          </View>
        </View>)
    }
  }
}

const styles = StyleSheet.create({
  modal: {
    flex: .8,
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
    height: '12%',
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bookFormLabel: {
    fontSize: 20,
    fontWeight: '500',
    width: '33%',
    textAlign: 'center',
    color: COLORS.PRIMARY
  },
  formContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '95%',
    height: '85%'
  },
  datePickerHolder: {
    height: 200,
    width: '65%',
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
    width: '65%',
  },
  bookButton: {
    paddingVertical: 15,
    backgroundColor: COLORS.SECONDARY,
    width: '70%',
    marginTop: 10
  },
  inputRow: {
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  backButton: {
    position: 'absolute',
    top: 25,
    left: 20,
    fontSize: 35,
    color: COLORS.SECONDARY,
  }
})