import React, { Component } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import { Agenda } from 'react-native-calendars';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { dateToString, loadUser, loadAcceptedSchedule, dateforAgenda, loadAvailableSchedule, loadTrainer } from '../components/Functions';
const loading = require('../images/loading.gif');

export class ScheduleModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			date: new Date()
		};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount(){
		// load trainer and user info and trainer sessions
		if(!this.state.trainer || !this.state.sessions || !this.state.user){
			try {
				var user = await loadUser(firebase.auth().currentUser.uid)
				var trainer = await loadTrainer(this.props.trainer.key);
				var sessions = await loadAcceptedSchedule(this.props.trainer.key);
				var availability = await loadAvailableSchedule(this.props.trainer.key);
				sessions = sessions.concat(availability);
				this.setState({user, trainer, sessions});
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert(`There was an error loading the trainer's schedule.`);
				this.props.hideandOpen();
			}
		}
	}

	renderAgendaItem(item, firstItemInDay){
		return (
			<View style={styles.agendaItem}>
				<Text style={styles.agendaItemHeader}>{item.text}</Text>
				<Text style={styles.agendaItemText}>{dateToString(item.start)}</Text>
				<Text style={styles.agendaItemText}>to</Text>
				<Text style={styles.agendaItemText}>{dateToString(item.end)}</Text>
			</View>
		);
	}

	renderAgendaEvents(){
		const startDate = this.state.date.getTime();
		const endDate = new Date(this.state.date.getTime() + 86400000 * 14).getTime();
		const events = {};
		for(let currDate = startDate; currDate <= endDate; currDate += 86400000){
			const currentDay = new Date(currDate);
			events[dateforAgenda(currentDay)] = this.state.sessions.filter((session) => {
				return dateforAgenda(currentDay) == dateforAgenda(new Date(session.start))
			});
		}
		return events;
	}

	render(){
		if(!this.state.trainer || !this.state.user || !this.state.sessions){
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		const events = this.renderAgendaEvents();
		return(
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.backButton} onPress={this.props.hideandOpen}>
						<FontAwesome name="arrow-left" size={35} />
					</Text>
					<Text style={styles.trainerName}> {this.state.trainer.name} </Text>
				</View>
				<View style={styles.calendarContainer}>
					<Agenda 
						style={styles.calendar}
						minDate={this.state.date}
						maxDate={new Date(this.state.date.getTime() + 86400000 * 14)}
						items={events}
						renderItem={this.renderAgendaItem}
						renderEmptyDate={() => {return (<View />);}}
						rowHasChanged={(r1, r2) => {return r1.text !== r2.text}}
					/>
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
  backButton: {
    position: 'absolute',
    left: 10,
    fontSize: 35,
    color: COLORS.SECONDARY,
	},
	calendarContainer: {
		flex: 6,
		width: '100%'
	},
	calendar: {
		height: '100%',
		width: '100%',
	},
	agendaItem: {
		height: 100,
		width: '90%',
		backgroundColor: COLORS.SECONDARY,
		textAlign: 'left',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		margin: 10,
	},
	agendaItemHeader: {
		color: COLORS.WHITE,
		fontSize: 20,
		fontWeight: '300'
	},
	agendaItemText: {
		color: COLORS.PRIMARY,
		fontSize: 15,
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