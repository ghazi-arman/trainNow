import React, { Component } from 'react';
import { StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Font } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';

export class OwnerHistoryPage extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
      		sessions: 'null',
      		loaded: false,
      		reportModal: false,
      		reportSession: '',
      		report: ''
      	}
	}

	// load font after render the page
	componentDidMount() {
		Font.loadAsync({
		  fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		this.loadSessions(this.props.userKey);
	}

	loadSessions(userKey){
		var sessions = [];
    	var gymsRef = firebase.database().ref('pastSessions/' + userKey);
    	gymsRef.on('value', function(data) {
    		data.forEach(function(dbevent) {
        		var item = dbevent.val();
        		item.session.key = dbevent.key;
        		sessions.push(item.session);
      		}.bind(this));
      		this.setState({sessions: sessions, loaded: true});
    	}.bind(this));
    }

    //go to map
    goToMap(){
    	Actions.MapPage();
    }

    //Convert Date to readable format
	dateToString(start){

	    var pendingDate = new Date(start);
	    var hour = pendingDate.getHours();
	    var minute = pendingDate.getMinutes();
	    var abbr;

	    if(minute < 10){
	        minute = '0' + minute;
	    }
	    if(hour == 0){
	    	hour = 12;
	    }
	    //Sets abbr to AM or PM
	    if(hour > 12){
	      hour = hour - 12;
	      abbr = 'PM';
	    }else{
	      abbr = 'AM'
	    }

	    var displayDate = hour + ':' + minute + abbr;
	    return displayDate;
  	}
  	renderStars(rating){
  		var star = [];
  		var numStars = 0;
  		while(rating > 0){
  			star.push(<FontAwesome key={numStars}>{Icons.star}</FontAwesome>);
  			rating--;
  			numStars++;
  		}
  		while(numStars < 5){
  			star.push(<FontAwesome key={numStars}>{Icons.starO}</FontAwesome>);
  			numStars++;
  		}
  		return star;
  	}

  	hideReportModal = () => this.setState({ reportModal: false, report: '' });

  	reportSession(session){
  		this.hideReportModal();
  		var reportRef = firebase.database().ref('reportSessions');
    	var user = firebase.auth().currentUser;
    	var reason = this.state.report;
    	if(this.props.userKey  == session.trainee){
    		var reporter = session.trainee;
    	}else{
    		var reporter = session.trainer;
    	}
  		reportRef.child(session.key + reporter).set({
  			sessionKey: session.key,
  			trainer: session.trainer,
  			trainee: session.trainee,
  			reportedBy: reporter,
  			reason: reason,
  		});
  		setTimeout(() => Alert.alert('Session Reported!'), 1000);
  	}

	renderSessions(){
		var sessions = this.state.sessions;
		sessions.sort(function(a, b){ return (new Date(b.start) - new Date(a.start))});
		var sessionsList = sessions.map(function(session){

	       	var startDate = this.dateToString(session.start);
	       	var endDate = this.dateToString(session.end);
	       	var day = (new Date(session.start).getMonth() + 1) + " / " + new Date(session.start).getDate();
			var minutes = Math.floor(((new Date(session.end) - new Date(session.start))/1000)/60);
			var rate = (parseInt(minutes) * (parseInt(session.rate) / 60)).toFixed(2);
			var payout = (parseFloat(rate) - (parseFloat(rate) * .2)).toFixed(2);

			if(session.trainee == this.props.userKey){
				var rateView = (<View style={styles.sessionRow}><Text style={styles.smallText}>${rate}</Text></View>);
				var client = (<Text style={styles.titleText}>Trained by {session.trainerName}</Text>);
				var stars = this.renderStars(session.traineeRating);
			}else{
				var rateView = (<View style={styles.sessionRow}><Text style={styles.smallText}>${payout}</Text></View>);
				var client = (<Text style={styles.titleText}>You trained {session.traineeName}</Text>);
				var stars = this.renderStars(session.trainerRating);
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
	    }.bind(this));
	    return sessionsList;
	}

	render() {
		if(this.state.loaded == false){
			return <Expo.AppLoading />;
		}
		return (
			<View style = {styles.container}>
				<Text style={styles.backButton} onPress={this.goToMap}>
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
