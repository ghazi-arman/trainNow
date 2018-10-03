import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';

export class SessionModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			pendingSessions: 'null',
			acceptSessions: 'null',
			loaded: false
		}
		this.acceptSession=this.acceptSession.bind(this);
		this.loadSessions=this.loadSessions.bind(this);
	}

	componentDidMount(){
		var user = firebase.auth().currentUser;
		if(!this.state.loaded){
			this.loadSessions(user.uid);
		}
	}

	//Load Pending sessions still awaiting accept by trainer
	async loadSessions(userKey){
		var pendingRef = firebase.database().ref('pendingSessions');
		var acceptRef = firebase.database().ref('trainSessions');
		var usersRef = firebase.database().ref('users');
    	var acceptSession = null;
    	var acceptSessions = [];
		var pendingSession = null;
		var pendingSessions = [];
		var rv;

		rv = await usersRef.orderByKey().equalTo(userKey).on("child_added", function(snapshot) {
	   		var currentUser = snapshot.val();

		   	if(currentUser.trainer){

		   		pendingRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
		    	  	pendingSession = snapshot.val();
			      	if(pendingSession != null){
			      		if(pendingSession.end == null){
			      			pendingSession.key = snapshot.key;
			      			pendingSessions.push(pendingSession);
			      		}
			      	}
		   	 	});

		   	 	acceptRef.orderByChild('trainer').equalTo(userKey).once('value', function(snapshot) {
		      		acceptSession = snapshot.val();
		      		if(acceptSession != null){
		      			if(acceptSession.end == null){
			      			acceptSession.key = snapshot.key;
		      				acceptSessions.push(acceptSession);
		      			}
		      		}
		    	}); 
		   	}else{

			    pendingRef.orderByChild('trainee').equalTo(userKey).once('child_added', function(snapshot) {
			      	pendingSession = snapshot.val();
			      	if(pendingSession != null){
			      		if(pendingSession.end == null){
			      			pendingSession.key = snapshot.key;
				    	  	pendingSessions.push(pendingSession);
			      		}
			      	}	    
			  	});

			    acceptRef.orderByChild('trainee').equalTo(userKey).once('value', function(snapshot) {
			    	acceptSession = snapshot.val();
			      	if(acceptSession != null){
			      		if(acceptSession.end == null){
			      			acceptSession.key = snapshot.key;
			      			acceptSessions.push(acceptSession);
			      		}
			    	}
			    });
			}
		});
	    		
		this.setState({pendingSessions: pendingSessions, acceptSessions: acceptSessions, loaded: true});
		this.markRead();

	}

  	//mark all sessions shown to user as read in db
  	markRead(){
	    var user = firebase.auth().currentUser;
	    if(this.state.pendingSessions.length > 0){
	    	this.state.pendingSessions.map(function(session){
      	  		if(user.uid == session.trainer){
         			firebase.database().ref('/pendingSessions/'+ session.key).update({
            			read: true
          			});
        		}
      		});
	    }
	   	if(this.state.acceptSessions.length > 0){
	    	this.state.acceptSessions.map(function(session){
	      		if(user.uid == session.trainee){
	        		firebase.database().ref('/trainSessions/'+ session.key).update({
	        	  		read: true
	        		});
	      		}
	    	});
	    }
  	}

	//Accept pending Session as trainer
	acceptSession(session){
	    var user = firebase.auth().currentUser;
	    var sessionRef = firebase.database().ref('trainSessions');
	    var pendingRef = firebase.database().ref('pendingSessions');
	    var pendingSessions = this.state.pendingSessions;

	    Alert.alert(
	      'Are you sure you want to accept this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          sessionRef.child(session.key).set({
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
	          pendingRef.child(session.key).remove();
	          pendingSessions.splice(pendingSessions.indexOf(session.key), 1);
	          this.setState({pendingSessions: pendingSessions});
	        }
	      }]);
	}

	//Cancel pending session as trainee
	cancelSession(session){
	    var pendingRef = firebase.database().ref('pendingSessions');
	    var pendingSessions = this.state.pendingSessions
	    Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          pendingRef.child(session.key).remove();
	          pendingSessions.splice(pendingSessions.indexOf(session.key), 1);
	          this.setState({pendingSessions: pendingSessions});
	        }
	      }]);
	}

	//Cancel accept session as trainee
  	cancelAccept(session){
	    var sessionRef = firebase.database().ref('trainSessions');
	    acceptSessions = this.state.acceptSessions;
	        Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          sessionRef.child(session.key).remove();
	          acceptSessions.splice(acceptSessions.indexOf(session.key), 1);
	          this.setState({acceptSessions: acceptSessions});
	        }
	      }]);
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

	render(){
		if((this.state.pendingSessions == 'null' && this.state.acceptSessions == 'null') || !this.state.loaded){
			return <Expo.AppLoading />;
		}else{
			var acceptSessions = this.state.acceptSessions;
			var pendingSessions = this.state.pendingSessions;
			var userKey = firebase.auth().currentUser.uid;
		 	var pendingList = pendingSessions.map(function(session){

		    	var displayDate = this.dateToString(session.start);
		        if(session.trainee == userKey){

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
		    var acceptList = acceptSessions.map(function(session){

		        var displayDate = this.dateToString(session.start);
		        if(session.trainee == userKey){
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
			return(
			 <View style={styles.modal}>
	            <Text style={styles.upcomingName}>Upcoming Sessions</Text>
	            {acceptList}
	            <Text style={styles.pendingName}>Pending Sessions</Text>
	            {pendingList}
	        </View>)
		}
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .7,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: '#252a34',
		borderRadius: 10,
	},
	trainerView: {
    	width: '30%',
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
	upcomingName: {
    	fontFamily: 'latoBold',
    	fontSize: 30,
    	color: '#ff2e63',
    	fontWeight: '500',
    	marginTop: 15,
  	},
  	pendingName: {
    	fontFamily: 'latoBold',
    	fontSize: 30,
    	color: '#08d9d6',
    	fontWeight: '500',
    	marginTop: 15,
  	},
  	trainerInfo: {
    	paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '700',
    	color: '#FAFAFA',
  	},
  	rateView: {
    	width: '15%',
    	height: 50
  	},
  	buttonContainer: {
    	height: 48,
    	backgroundColor: '#ff2e63',
    	flexDirection: 'column',
    	justifyContent: 'center'
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FAFAFA',
    	fontWeight: '700'
  	},
})