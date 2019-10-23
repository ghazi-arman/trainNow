import React, { Component } from 'react';
import { StyleSheet, Text, View, DatePickerIOS, TouchableOpacity, Alert, ScrollView } from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import firebase from 'firebase';
import { AppLoading } from 'expo';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadUser, addAvailableSession } from '../components/Functions'; 

export class SchedulerModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			startDate: new Date(),
      endDate: new Date()
		};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount(){
		// load user info
		if(!this.state.user){
			try {
				const user = await loadUser(firebase.auth().currentUser.uid);
				this.setState({ user });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the scheduler.');
				this.props.hide();
			}
		}
  }

  addSession(startDate, endDate){
		addAvailableSession(this.props.trainerKey, startDate, endDate);
		this.props.hideandConfirm();
  }

	render(){
		if(!this.state.user){
			return <AppLoading />
		}
		return(
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.trainerName}>Add Availability</Text>
					<Text style={styles.closeButton} onPress={this.props.hide}>
						<FontAwesome>{Icons.close}</FontAwesome>
					</Text>
				</View>
				<View style={styles.formContainer}>
					<ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
						<View style={styles.inputRow}>
							<Text style={styles.formLabel}>Start Time</Text>
							<View style={styles.datePickerHolder}>
								<DatePickerIOS
									mode='datetime'
									itemStyle={{ color: COLORS.PRIMARY }}
									textColor={COLORS.PRIMARY}
									style={styles.datepicker}
									minuteInterval={5}
									minimumDate={new Date(new Date().getTime())}
									date={this.state.startDate}
									onDateChange={(date) => this.setState({ startDate: date })}
								/>
							</View>
						</View>
						<View style={styles.inputRow}>
							<Text style={styles.formLabel}>End Time</Text>
							<View style={styles.datePickerHolder}>
								<DatePickerIOS
									mode='datetime'
									itemStyle={{ color: COLORS.PRIMARY }}
									textColor={COLORS.PRIMARY}
									style={styles.datepicker}
									minuteInterval={5}
									minimumDate={new Date(this.state.startDate.getTime())}
									date={this.state.endDate}
									onDateChange={(date) => this.setState({ endDate: date })}
								/>
							</View>
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
	  height: '15%',
		width: '100%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	formContainer: {
		height: '80%',
		width: '100%',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	center: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	closeButton: {
		position: 'absolute',
		top: 5,
		right: 5,
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
		paddingTop: 10,
		paddingBottom: 10
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
  datePickerHolder: {
		height: 200,
		width: 250,
	},
  datepicker: {
		height: 200,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
	},
})