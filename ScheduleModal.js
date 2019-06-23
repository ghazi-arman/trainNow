import React, { Component } from 'react';
import { StyleSheet, Text, View, Alert} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import firebase from 'firebase';
import { AppLoading} from 'expo';
import COLORS from './Colors';
import { dateToString } from './Functions';
import {Calendar, CalendarList, Agenda} from 'react-native-calendars';

export class ScheduleModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: 'null',
			user: 'null',
			date: new Date()
		};
		this.loadTrainer=this.loadTrainer.bind(this);
		this.renderAgendaItem=this.renderAgendaItem.bind(this);
	}

	componentDidMount(){
		this.loadTrainer(this.props.trainer.key);

		//Get user info for state
		var user = firebase.auth().currentUser;
		firebase.database().ref('/users/' + user.uid).once('value', function(snapshot) {
			this.setState({user: snapshot.val()});
		}.bind(this));
	}

	//Loads selected trainer Info from db
	loadTrainer(trainerKey){
		firebase.database().ref('/users/' + trainerKey).once('value', function(snapshot){
		var trainer = snapshot.val();
		trainer.key = snapshot.key;
			this.setState({
				trainer: trainer
			});
		}.bind(this));
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

	render(){
		if(this.state.trainer == 'null' || typeof this.state.trainer == undefined){
			return <Expo.AppLoading />
		}else{
			return(
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
						<Text style={styles.trainerName}>{this.state.trainer.name}</Text>
					</View>
						<Text style={styles.backButton} onPress={this.props.hideandOpen}>
								<FontAwesome>{Icons.arrowLeft}</FontAwesome>
						</Text>
						<Agenda 
							style={styles.calendar}
							minDate={this.state.date}
							maxDate={new Date().setDate(this.state.date.getDate() + 14)}
							items={{
								'2019-06-23': [
									{
										text: 'Training Session',
										start: this.state.date,
										end: new Date(this.state.date.getTime() + 3600000)
									},
									{
										text: 'Open Availability',
										start: this.state.date,
										end: new Date(this.state.date.getTime() + 4 * 3600000)
									}
								],
							}}
							renderItem={this.renderAgendaItem}
							renderEmptyDate={() => {return (<View />);}}
							rowHasChanged={(r1, r2) => {return r1.text !== r2.text}}
						/>
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
	calendar: {
		width: '100%',
		height: '100%'
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
	}
})