import React, { Component } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import COLORS from './Colors';
import { dateToString, loadAcceptedSchedule, dateforAgenda, loadAvailableSchedule, loadTrainer } from './Functions';
import { Agenda } from 'react-native-calendars';
const loading = require('../images/loading.gif');

export class TrainerSchedule extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			date: new Date()
		};
	}

	async componentDidMount(){
		// load trainer and user info and trainer sessions
		if(!this.state.trainer || !this.state.sessions){
			var trainer = await loadTrainer(this.props.trainerKey);
			var sessions = await loadAcceptedSchedule(this.props.trainerKey);
			var availability = await loadAvailableSchedule(this.props.trainerKey);
			sessions = sessions.concat(availability);
		}

		this.setState({trainer, sessions, trainer});
	}

	renderAgendaItem(item, firstItemInDay){
		return (
			<View style={styles.agendaItem}>
				<Text style={styles.agendaItemHeader}>{item.text}</Text>
				<Text style={styles.agendaItemText}>{dateToString(item.start)}</Text>
				<Text style={styles.agendaItemText}>to</Text>
				<Text style={styles.agendaItemText}>{dateToString(item.end)}</Text>
			</View>
		)
	}

	renderAgendaEvents(){
		let startDate = this.state.date.getTime();
		let endDate = new Date(this.state.date.getTime() + 86400000 * 14).getTime();
		let events = {};
		for(let currDate = startDate; currDate <= endDate; currDate += 86400000){
			let currentDay = new Date(currDate);
			events[dateforAgenda(currentDay)] = this.state.sessions.filter(function(session){
				return dateforAgenda(currentDay) == dateforAgenda(new Date(session.start))
			})
		}
		return events;
	}

	render(){
		if(!this.state.trainer || !this.state.sessions){
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}else{
			let events = this.renderAgendaEvents();
			return(
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
						<Text style={styles.trainerName}>Schedule</Text>
						<Text style={styles.closeButton} onPress={this.props.hideandOpen}>
							<FontAwesome name="close" size={35} />
						</Text>
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
	    )
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
	closeButton: {
		position: 'absolute',
		top: 0,
		right: 0,
		fontSize: 35,
		color: COLORS.RED,
	},
	calendarContainer: {
		flex: 6,
		width: '100%'
	},
	calendar: {
		height: '100%',
		width: '100%'
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