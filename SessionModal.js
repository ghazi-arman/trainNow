import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';



export class SessionModal extends Component {
	
	constructor(props) {
		super(props);
	}

	//Accept pending Session as trainer
	acceptSession(session){
	    var user = firebase.auth().currentUser;
	    var sessionRef = firebase.database().ref('trainSessions');
	    var pendingRef = firebase.database().ref('pendingSessions');

	    Alert.alert(
	      'Are you sure you want to accept this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          sessionRef.child(session.trainee).set({
	            trainee: session.trainee,
	            trainer: session.trainer,
	            traineeName: session.traineeName,
	            trainerName: session.trainerName,
	            start: session.start,
	            duration: session.duration,
	            location: session.location,
	            rate: session.rate,
	            traineeLoc: null,
	            trainerLoc: null,
	            trainerReady: false,
	            traineeReady: false,
	            met: false,
	            read: false,
	            end: null,
	            traineeRating: null,
	            trainerRating: null,
	            traineeEnd: false,
	            trainerEnd: false,
	          });
	          pendingRef.child(session.trainee).remove();
	        }
	      }]);
	}

	//Cancel pending session as trainee
	cancelSession(session){
	    var pendingRef = firebase.database().ref('pendingSessions');
	    Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          pendingRef.child(session.trainee).remove();
	        }
	      }]);
	}

	//Cancel accept session as trainee
  	cancelAccept(session){
	    var sessionRef = firebase.database().ref('trainSessions');
	        Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          sessionRef.child(session.trainee).remove();
	        }
	      }]);
	    this.setState({pendingLoaded: false});
  	}

	//Convert Date to readable format
	dateToString(start){

	    var pendingDate = new Date(start);
	    var month = pendingDate.getMonth() + 1;
	    var day = pendingDate.getDate();
	    var hour = pendingDate.getHours();
	    var minute = pendingDate.getMinutes();
	    var abbr;

	    if(minute < 10){
	        minute = '0' + minute;
	    }
	    //Sets abbr to AM or PM
	    if(hour > 12){
	      hour = hour - 12;
	      abbr = 'PM';
	    }else{
	      abbr = 'AM'
	    }

	    var displayDate = month + '/' + day + ' ' + hour + ':' + minute + abbr;
	    return displayDate;
  	}

	render(){
		var uid = firebase.auth().currentUser.uid;

		if(this.props.pending != null){
	      	var pendingList =  this.props.pending.map(function(session){

	        var displayDate = this.dateToString(session.start);

	        if(session.trainee == uid){

	          var button = (
	            <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.cancelSession(session)}>
	              <Text 
	                style={styles.buttonText}
	              >
	              Cancel
	              </Text>
	            </TouchableOpacity>);
	          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
	        
	        }else{

	          var button = (
	            <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.acceptSession(session)}>
	              <Text 
	                style={styles.buttonText}
	              >
	              Accept
	              </Text>
	            </TouchableOpacity>);
	            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
	        }
	        return(
	        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.trainee}>
	          <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}} key={session.trainee}>
	            <View style={{width: '70%', flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
	              {name}
	              <View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
	              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
	            </View> 
	            <View style={{width: '25%', height: 50}}>
	              {button}
	            </View>
	          </View>
	        </View>
	        );
	      }.bind(this));
	    }

      if(this.props.accepted != null){
	      var uid = firebase.auth().currentUser.uid;
	      var acceptList =  this.props.accepted.map(function(session){
	        var displayDate = this.dateToString(session.start);
	        if(session.trainee == uid){
	          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
	        }else{
	            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
	        }
	        return(
	        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.trainee}>
	          <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}} key={session.trainee}>
	            <View style={{width: '70%', flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
	              {name}
	              <View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
	              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
	            </View> 
	            <View style={{width: '25%', height: 50}}>
	              <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.cancelAccept(session)}>
	                <Text 
	                  style={styles.buttonText}
	                >
	                Cancel
	                </Text>
	              </TouchableOpacity>
	            </View>
	          </View>
	        </View>
	        );
	      }.bind(this));
	    }
		return(
			 <View style={styles.modal}>
	            <Text style={styles.gymName}>Upcoming Sessions</Text>
	            {acceptList}
	            <Text style={styles.gymName}>Pending Sessions</Text>
	            {pendingList}
	        </View>)
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .7,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 10,
	},
	trainerView: {
    	width: '25%',
    	height: 50
  	},
	bookDetails:{
    	fontSize: 20,
    	fontWeight: '500'
  	},
  	bookFormLabel: {
    	fontSize: 20,
    	fontWeight: '500',
    	width: '35%'
  	},
	gymName: {
    	fontFamily: 'latoBold',
    	fontSize: 30,
    	color: 'black',
    	fontWeight: '500',
    	marginTop: 15,
  	},
  	trainerInfo: {
    	paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '700',
  	},
  	rateView: {
    	width: '15%',
    	height: 50
  	},
  	buttonContainer: {
    	height: 48,
    	backgroundColor: '#C51162',
    	flexDirection: 'column',
    	justifyContent: 'center'
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FFFFFF',
    	fontWeight: '700'
  	},
})