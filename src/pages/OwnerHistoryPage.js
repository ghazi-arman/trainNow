import React, { Component } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadSessions, dateToString, renderStars, reportSession } from './../components/Functions';

export class OwnerHistoryPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			reportModal: false,
			report: ''
		}
		this.bugsnagClient = bugsnag();
	}

	// load font after render the page
	async componentDidMount() {
		try {
			const sessions = await loadSessions(this.props.userKey);
			this.setState({ sessions });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error loading the history for that trainer.');
			this.goBack();
		}
	}
	
	goBack = () => Actions.pop();

  hideReportModal = () => this.setState({ reportModal: false, report: '' });

	reportSession = async(session) => {
		this.hideReportModal();
		reportSession(session, session.trainer, this.state.report);
		setTimeout(() => Alert.alert('Session Reported!'), 1000);
	}

	renderSessions = () => {
		this.state.sessions.sort(function(a, b){ return (new Date(b.start) - new Date(a.start))});
		return this.state.sessions.map((session) => {
	  	const startDate = dateToString(session.start);
			const endDate = dateToString(session.end);
			const day = (new Date(session.start).getMonth() + 1) + " / " + new Date(session.start).getDate();
			const minutes = Math.floor(((new Date(session.end) - new Date(session.start))/1000)/60);
			const rate = (parseInt(minutes) * (parseInt(session.rate) / 60)).toFixed(2);
			const payout = (parseFloat(rate) - (parseFloat(rate) * .2)).toFixed(2);
			
			let rateView, client, stars;
			if(session.trainee == this.props.userKey){
				rateView = (<View style={styles.sessionRow}><Text style={styles.smallText}>${rate}</Text></View>);
				client = (<Text style={styles.titleText}>Trained by {session.trainerName}</Text>);
				stars = renderStars(session.traineeRating);
			}else{
				rateView = (<View style={styles.sessionRow}><Text style={styles.smallText}>${payout}</Text></View>);
				client = (<Text style={styles.titleText}>You trained {session.traineeName}</Text>);
				stars = renderStars(session.trainerRating);
			}
			
			return(
				<View style={styles.sessionContainer} key={session.key}>
					<View style={styles.sessionRow}>{client}</View>
					<View style={styles.sessionRow}><Text style={styles.icon}>{stars}</Text></View>
					<View style={styles.sessionRow}><Text style={styles.smallText}>{session.gym}</Text></View>
					{rateView}
					<View style={styles.sessionRow}><Text style={styles.smallText}>{day}</Text></View>
					<View style={styles.sessionRow}>
						<View style={styles.halfRow}><Text style={styles.timeText}>Start: {startDate}</Text></View>
						<View style={styles.halfRow}><Text style={styles.timeText}>End: {endDate}</Text></View>
					</View>
					<View style={styles.sessionRow}>
						<TouchableOpacity style={styles.buttonContainer} onPress={() => this.setState({reportModal: true, reportSession: session})}>
							<Text style={styles.buttonText}>Report Session</Text>
						</TouchableOpacity>
					</View>
				</View>
			);
	  });
	}

	render() {
		if(!this.state.sessions){
			return <AppLoading />;
		}
		return (
			<View style = {styles.container}>
				<Text style={styles.backButton} onPress={this.goBack}>
          <FontAwesome>{Icons.arrowLeft}</FontAwesome>
        </Text>
				<Text style={styles.header}>Trainer History</Text>
				<View style={styles.historyContainer}>		
					<ScrollView showsVerticalScrollIndicator={false}>
						{this.renderSessions()}
					</ScrollView>
				</View>
				<Modal isVisible={this.state.reportModal}
					onBackdropPress={this.hideReportModal}>
					<KeyboardAvoidingView behavior="padding" style={styles.reportModal}>
						<Text style={styles.titleText}>Report Session</Text>
						<TextInput 
						placeholder="What was the problem?"
						style={styles.input}
						returnKeyType="done"
						multiline={true}
						placeholderTextColor={COLORS.PRIMARY}
						onChangeText = {(report) => this.setState({report})}
						value={this.state.report} />
        		<TouchableOpacity style={styles.submitButton} onPress={() => this.reportSession(this.state.reportSession)}>
		          <Text style={styles.buttonText}>Report Session</Text>
		        </TouchableOpacity>
        	</KeyboardAvoidingView>
      	</Modal>
			</View>	
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'	
	},
	reportModal: {
		flex: .3,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	historyContainer: {
		paddingLeft: 27,
		width: '100%',
		height: '80%',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	sessionContainer: {
  		width: '90%',
  		backgroundColor: '#f6f5f5',
  		flexDirection: 'column',
  		justifyContent: 'flex-start',
  		alignItems: 'center',
	   	borderRadius: 5,
	   	borderWidth: 1,
	   	borderColor: COLORS.PRIMARY,
	   	marginTop: 20
  	},
  	sessionRow: {
  		flexDirection: 'row',
  		justifyContent: 'center'
  	},
  	halfRow: {
  		width: '50%',
  		flexDirection: 'row',
  		justifyContent: 'center'
  	},
  	header: {
  		marginTop: 45,
  		fontSize: 30,
  		fontWeight: '700',
  		color: COLORS.PRIMARY,
  	},
  	titleText: {
    	fontSize: 20,
    	fontWeight: '600',
    	color: COLORS.PRIMARY
  	},
  	smallText: {
  		fontSize: 15,
  		fontWeight: '400',
  		color: COLORS.PRIMARY
  	},
  	timeText: {
  		fontSize: 12,
  		fontWeight: '400',
  		color: COLORS.PRIMARY
  	},
  	icon: {
  		color: COLORS.SECONDARY,
		fontSize: 15,
  	},
  	buttonText: {
		fontSize: 15,
		textAlign: 'center',
		color: '#f6f5f5',
		fontWeight: '500'
	},
	buttonContainer: {
		backgroundColor: COLORS.SECONDARY,
		padding: 5,
		margin: 5
	},
	submitButton: {
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 10,
		margin: 5,
		width: '80%'
	},
	input: {
		height: 80,
		width: '80%',
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		width: '80%',
		color: COLORS.PRIMARY,
	},
	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
	}
});