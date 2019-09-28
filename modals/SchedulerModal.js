import React, { Component } from 'react';
import { StyleSheet, Text, View, DatePickerIOS, TouchableOpacity, Alert } from 'react-native';
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
    this.props.hide();
  }

	render(){
		if(!this.state.user){
			return <AppLoading />
		}
		return(
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.trainerName}>Add Availability</Text>
				</View>
				<Text style={styles.backButton} onPress={this.props.hideandOpen}>
						<FontAwesome>{Icons.arrowLeft}</FontAwesome>
				</Text>
				<View style={styles.formContainer}>
					<Text style={{fontSize:20, color: COLORS.PRIMARY, fontWeight: '500'}}>Start Time</Text>
					<View style={styles.inputRow}>
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
					<Text style={{fontSize:20, color: COLORS.PRIMARY, fontWeight: '500'}}>End Time</Text>
					<View style={styles.inputRow}>
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
				</View>
			</View>
		);
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
	backButton: {
		position: 'absolute',
		top: 25,
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
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
  datePickerHolder: {
		height: 200,
		width: '100%',
	},
  datepicker: {
		height: 200,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
	},
})