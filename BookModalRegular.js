import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, DatePickerIOS, Picker } from 'react-native';
import firebase from 'firebase';
import { AppLoading } from 'expo';
import COLORS from './Colors';
import { dateToString, timeOverlapCheck, loadUser, loadGym, loadAcceptedSchedule, loadPendingSchedule, createPendingSession, sendMessage } from './Functions';

export class BookModalRegular extends Component {
	constructor(props) {
		super(props);
		this.state = {
			bookDate: new Date(),
			bookDuration: '60',
		};
	}

	async componentDidMount() {
		if(!this.state.trainer || !this.state.user || !this.state.gym){
			let trainer = await loadUser(this.props.trainer);
			let user = await loadUser(firebase.auth().currentUser.uid);
			let gym = await loadGym(this.props.gym);
			this.setState({user, trainer, gym});
		}
	}

	async bookTrainer() {
		let user = firebase.auth().currentUser;
		if (!this.state.user.cardAdded) {
			Alert.alert('You must have a card on file to book a session.');
			return;
		}
		if (user.uid == this.state.trainer.key) {
			Alert.alert('You cannot book yourself as a Trainer!');
			return;
		}
		if (this.state.trainer.active == false) {
			Alert.alert('Sorry, this trainer is no longer active.');
			return;
		}

		// Pulls schedules for trainers and conflicts to check for overlaps
    let trainerSchedule = await loadAcceptedSchedule(this.props.trainer);
    let pendingSchedule = await loadPendingSchedule(user.uid);
    let traineeSchedule = await loadAcceptedSchedule(user.uid);
    traineeSchedule = traineeSchedule.concat(pendingSchedule);
		let endTime = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration));
		let timeConflict = false;

		trainerSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('The Trainer has a session during this time.');
				timeConflict = true;
				return;
			}
		}.bind(this));

		traineeSchedule.forEach(function(currSession){
			if(timeOverlapCheck(currSession.start, currSession.end, this.state.bookDate, endTime)){
				Alert.alert('You already have a pending session or session during this time.');
				timeConflict = true;
				return;
			}
		}.bind(this));

		if(timeConflict) return;
		
		// create session in pending table
    let price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);
    let trainer = this.state.trainer;
    let trainee = this.state.user;
    trainee.uid = firebase.auth().currentUser.uid;
    trainer.key = this.props.trainer;
    Alert.alert(
      'Request session with ' + this.state.trainer.name + ' for $' + price + ' at ' + dateToString(this.state.bookDate),
      '',
      [
        { text: 'No' },
        {
          text: 'Yes', onPress: async () => {
            createPendingSession(trainee, trainer, this.state.gym, this.state.bookDate, this.state.bookDuration, 'trainee');
            try {
              let message = this.state.user.name + " has requested a session at " + dateToString(this.state.bookDate) + " for " + this.state.bookDuration + " mins.";
              sendMessage(this.state.trainer.phone, message);
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
		if (!this.state.trainer || !this.state.trainer || !this.state.gym) {
			return <AppLoading />
		} else {
			return (
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
						<Text style={styles.trainerName}>{this.state.trainer.name}</Text>
					</View>
					<View style={styles.formContainer}>
						<Text style={styles.bookDetails}>{this.state.gym.name}</Text>
						<Text style={{fontSize:20, color: COLORS.PRIMARY, fontWeight: '500'}}>Session Time</Text>
						<View style={styles.inputRow}>
							<View style={styles.datePickerHolder}>
								<DatePickerIOS
									mode='datetime'
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
				</View>
			)
		}
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .9,
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
	bookDetails: {
		fontSize: 20,
		fontWeight: '500',
		color: COLORS.PRIMARY
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
		width: '100%',
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
	}
})