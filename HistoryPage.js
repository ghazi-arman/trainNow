import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {Permissions, Location, Font, ImagePicker, AppLoading} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';
import { HistoryBar } from './HistoryBar';

export class HistoryPage extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
      		sessions: 'null',
      		loaded: false
      	}
	}

	// load font after render the page
	componentDidMount() {
		Expo.Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		var user = firebase.auth().currentUser;
		this.loadSessions(user.uid);
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

	renderSessions(){
		var sessions = this.state.sessions;
		var user = firebase.auth().currentUser.uid;
		var sessionsList = sessions.map(function(session){

	       	var startDate = this.dateToString(session.start);
	       	var endDate = this.dateToString(session.end);
			var minutes = Math.floor(((new Date(session.end) - new Date(session.start))/1000)/60);
			var rate = (parseInt(minutes) * (parseInt(session.rate) / 60)).toFixed(2);
			if(session.trainee == user){
				var client = (<Text style={styles.titleText}>Trained by {session.trainerName}</Text>);
			}else{
				var client = (<Text style={styles.titleText}>You trained {session.traineeName}</Text>);
			}
			return(
		        <View style={styles.sessionContainer} key={session.key}>
		            <View style={styles.sessionRow}>{client}</View>
		            <View style={styles.sessionRow}><Text style={styles.smallText}>{session.gym}</Text></View>
		            <View style={styles.sessionRow}><Text style={styles.smallText}>${rate}</Text></View>
		            <View style={styles.sessionRow}>
		            	<View style={styles.halfRow}><Text style={styles.timeText}>Start: {startDate}</Text></View>
		            	<View style={styles.halfRow}><Text style={styles.timeText}>End: {endDate}</Text></View>
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
			<KeyboardAvoidingView 
				behavior="padding"
				style = {styles.container}
				>
				<Text style={styles.header}>Trainer History</Text>		
				<ScrollView contentContainerStyle = {styles.historyContainer}>
					{this.renderSessions()}
				</ScrollView>
				<HistoryBar map={() => Actions.reset('map')} account={() => Actions.reset('account')} pending={() => Actions.reset('modal')} history={() => Actions.reset('history')}/>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center'	
	},
	historyContainer: {
		width: '100%',
		flex: .7,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	sessionContainer: {
  		width: '90%',
  		flexDirection: 'column',
  		justifyContent: 'flex-start',
  		alignItems: 'center',
  		borderWidth: 1,
	   	borderColor: '#ff2e63',
	   	marginBottom: 10
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
  		paddingVertical: 40,
  		fontSize: 30,
  		fontWeight: '700',
  		color: '#08d9d6'
  	},
  	titleText: {
    	fontSize: 20,
    	fontWeight: '600',
    	color: '#08d9d6'
  	},
  	smallText: {
  		fontSize: 15,
  		fontWeight: '400',
  		color: '#ff2e63'
  	},
  	timeText: {
  		fontSize: 12,
  		fontWeight: '400',
  		color: '#08d9d6'
  	}
});
