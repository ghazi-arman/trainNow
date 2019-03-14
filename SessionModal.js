import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { MapView, AppLoading} from 'expo';

export class SessionModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			pendingSessions: [],
			acceptSessions: [],
			pendingLoaded: false,
			acceptLoaded: false,
			currentTab: 'pending'
		}
		this.acceptSession=this.acceptSession.bind(this);
		this.loadSessions=this.loadSessions.bind(this);
	}

	async componentDidMount(){
		var user = firebase.auth().currentUser;
		if(this.state.pendingLoaded == false && this.state.acceptLoaded == false){
			const loading = await this.loadSessions(user.uid);
			this.markRead();
		}
		var usersRef = firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	this.setState({user: snapshot.val()});
	    }.bind(this));
	}

	//Load Pending sessions still awaiting accept by trainer
	async loadSessions(userKey){
		var pendingRef = firebase.database().ref('pendingSessions');
		var acceptRef = firebase.database().ref('trainSessions');
		var usersRef = firebase.database().ref('users');
		var pendingSessions = [];
		var acceptSessions = [];
    	var acceptSession = null;
		var pendingSession = null;

		const loading = await usersRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
	   		var currentUser = snapshot.val();

		   	if(currentUser.trainer){

		   		pendingRef.orderByChild('trainer').equalTo(userKey).once('value', function(data) {
		    	  	data.forEach(function(snapshot){
			    		pendingSession = snapshot.val();
		      			if(pendingSession != null && pendingSession.end == null){
		      				pendingSession.key = snapshot.key;
			    	  		pendingSessions.push(pendingSession);
		      			}
			    	});
			    	this.setState({pendingSessions: pendingSessions, pendingLoaded: true});  
		   	 	}.bind(this));

		   	 	acceptRef.orderByChild('trainer').equalTo(userKey).once('value', function(data) {
		      		data.forEach(function(snapshot){
			    		acceptSession = snapshot.val();
			    		if(acceptSession != null && acceptSession.end == null){
			      			acceptSession.key = snapshot.key;
			      			acceptSessions.push(acceptSession);
			      		}
			    	});
			    	this.setState({acceptSessions: acceptSessions, acceptLoaded: true});
		    	}.bind(this)); 

		   	}else{

			    pendingRef.orderByChild('trainee').equalTo(userKey).once('value', function(data) {
			    	data.forEach(function(snapshot){
			    		pendingSession = snapshot.val();
		      			if(pendingSession != null && pendingSession.end == null){
		      				pendingSession.key = snapshot.key;
			    	  		pendingSessions.push(pendingSession);
		      			}
			    	});
			    	this.setState({pendingSessions: pendingSessions, pendingLoaded: true});  
			  	}.bind(this));

			    acceptRef.orderByChild('trainee').equalTo(userKey).once('value', function(data) {
			    	data.forEach(function(snapshot){
			    		acceptSession = snapshot.val();
			    		if(acceptSession != null && acceptSession.end == null){
			      			acceptSession.key = snapshot.key;
			      			acceptSessions.push(acceptSession);
			      		}
			    	});
			    	this.setState({acceptSessions: acceptSessions, acceptLoaded: true});
			    }.bind(this));
			}
		}.bind(this));
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

  	//Enter session
  	enterSession(session){
  		Actions.session({session: session});
  	}
  	//Go to map
  	goToMap(){
  		Actions.reset('map');
  	}

	//Accept pending Session as trainer
	async acceptSession(session){
	    var user = firebase.auth().currentUser;
	    var sessionRef = firebase.database().ref('trainSessions');
	    var pendingRef = firebase.database().ref('pendingSessions');
	    var pendingSessions = this.state.pendingSessions;
	    var acceptSessions = this.state.acceptSessions;

	    //Pull session for trainer to be booked and trainee to check for time conflicts
    	var sessions = [];
    	const trainerSessions = await sessionRef.orderByChild('trainer').equalTo(user.uid).once('value', function(snapshot){
    		snapshot.forEach(function(child){
    			sessions.push(child.val());
    		});
    	});

    	const userSessions = await sessionRef.orderByChild('trainee').equalTo(session.trainee).once('value', function(snapshot){
    		snapshot.forEach(function(child){
    			sessions.push(child.val());
    		});
    	});

		for(i = 0; i < sessions.length; i++){
    		var currSession = sessions[i];
    		var start2 = new Date(currSession.start).getTime();
    		var end2 = new Date(new Date(currSession.start).getTime() + (60000 * currSession.duration)).getTime();
    		var start1 = new Date(session.start).getTime();
    		var end1 = new Date(new Date(session.start).getTime() + (60000 * session.duration)).getTime();

    		if(start1 > start2 && start1 < end2 || start2 > start1 && start2 < end1){
    			if(session.trainer == user.uid){
    				Alert.alert('You have a session at ' + this.dateToString(currSession.start) + ' for ' + currSession.duration + ' mins.');
    				return;
    			}else{
    				Alert.alert(this.state.trainee.name + ' has a session at ' + this.dateToString(currSession.start) + ' for ' + currSession.duration + ' mins.');
    				return;
    			}
    		}
    	}

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
	            gym: session.gym,
	            traineeStripe: session.traineeStripe,
	            trainerStripe: this.state.user.stripeId,
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
	          pendingSessions.splice(pendingSessions.indexOf(session), 1);
	          acceptSessions.push(session);
	          this.setState({pendingSessions: pendingSessions, acceptSessions: acceptSessions});
	        }
	      }]);
	}

	//Cancel pending session as trainee
	cancelSession(session){
		var pendingSessions = this.state.pendingSessions;
	    var pendingRef = firebase.database().ref('pendingSessions');
	    Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	        	pendingRef.child(session.key).remove();
	          	pendingSessions.splice(pendingSessions.indexOf(session), 1);
	          	this.setState({pendingSessions: pendingSessions});
	        }
	      }]);
	}

	//Cancel accept session as trainee
  	cancelAccept(session){
  		if(new Date(session.start) <= new Date()){
			Alert.alert("You cannot cancel a session after it has started!");
			return;
		}
	    var sessionRef = firebase.database().ref('trainSessions');
	    var cancelRef = firebase.database().ref('cancelSessions');
	    var acceptSessions = this.state.acceptSessions;
	        Alert.alert(
	      'Are you sure you want to cancel this session?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	        	cancelRef.push(session);
	          	sessionRef.child(session.key).remove();
	          	acceptSessions.splice(acceptSessions.indexOf(session), 1);
	          	this.setState({acceptSessions: acceptSessions});
	        }
	      }]);
  	}

  	renderAccept(){
		var userKey = firebase.auth().currentUser.uid;	
		if(this.state.acceptSessions.length == 0){
			return (<Text style={styles.navText} >No Upcoming Sessions</Text>);
		} 	
	    var acceptList = this.state.acceptSessions.map(function(session){

	        var displayDate = this.dateToString(session.start);
	        if(session.trainee == userKey){
	          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
	        }else{
	            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
	        }
	        return(
	        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.key}>
	         	<View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
	            	{name}
	              	<View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
	              	<View style={styles.timeView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
	            </View> 
	           	<View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
	            	<TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelAccept(session)}>
	                	<Text style={styles.buttonText}> Cancel Session </Text>
	              	</TouchableOpacity>
	              	<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.enterSession(session.key)}>
	                	<Text style={styles.buttonText}> Enter Session </Text>
	              	</TouchableOpacity>
	          </View>
	        </View>
	        );
	    }.bind(this));
	    return acceptList;
  	}

  	renderPending(){
		var userKey = firebase.auth().currentUser.uid;
		if(this.state.pendingSessions.length == 0){
			return (<Text style={styles.navText}>No Pending Sessions</Text>);
		} 
  		var pendingList = this.state.pendingSessions.map(function(session){

	    	var displayDate = this.dateToString(session.start);
	        if(session.trainee == userKey){

	          var button = (
	            <TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
	              <Text 
	                style={styles.buttonText}
	              >
	              Cancel Session
	              </Text>
	            </TouchableOpacity>);
	          var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.trainerName}</Text></View>);
	        
	        }else{

	          var button = (
	            <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.acceptSession(session)}>
	              <Text 
	                style={styles.buttonText}
	              >
	              Accept Session
	              </Text>
	            </TouchableOpacity>);
	          var button2 = (
	            <TouchableOpacity style={styles.denyContainer} onPressIn={() => this.cancelSession(session)}>
	              <Text 
	                style={styles.buttonText}
	              >
	              Cancel Session
	              </Text>
	            </TouchableOpacity>);
	            var name = (<View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.traineeName}</Text></View>);
	        }
	        return(
	        <View style={{flexDirection: 'column', justifyContent: 'flex-start'}} key={session.key}>
	          	<View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
              		{name}
              		<View style={styles.rateView}><Text style={styles.trainerInfo}>{session.duration} min</Text></View>
              		<View style={styles.timeView}><Text style={styles.trainerInfo}>{displayDate}</Text></View>
	            </View>
	            <View style={{flexDirection: 'row', justifyContent: 'space-around', height: 50}}>
	              {button2}
	              {button}
	            </View>
	        </View>
	        );
	    }.bind(this));
	    return pendingList;
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
		if(this.state.pendingLoaded == false && this.state.acceptLoaded == false){
			return <Expo.AppLoading />;
		}else{
			if(this.state.currentTab == 'pending'){
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'pending'})}>
							<Text style={styles.navText}>Awaiting Response</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'accepted'})}>
							<Text style={styles.navText}>Upcoming Schedule</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderPending()}
	            	</ScrollView>
				);
			}else{
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'pending'})}>
							<Text style={styles.navText}>Awaiting Response</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'accepted'})}>
							<Text style={styles.navText}>Upcoming Schedule</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<ScrollView showsVerticalScrollIndicator={false}>
	            		{this.renderAccept()}
	            	</ScrollView>
				);
			}
			return(
		 		<View style = {styles.container}>
					<Text style={styles.backButton} onPress={this.goToMap}>
              			<FontAwesome>{Icons.arrowLeft}</FontAwesome>
            		</Text>
            		{navBar}
					{content}
        		</View>
        	);
		}
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'	
	},
	navigationBar: {
		width: '100%',
		height: 100,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 80,
	},
	activeTab: {
		width: '50%',
		backgroundColor: '#08d9d6',
		borderWidth: 1,
		borderColor: '#fafafa'
	},
	inactiveTab: {
		width: '50%',
		backgroundColor: '#252a34',
		borderWidth: 1, 
		borderColor: '#fafafa'
	},
	navText: {
		fontSize: 25,
		color: '#FAFAFA',
		textAlign: 'center'
	},
	trainerView: {
    	width: '35%',
    	height: 50
  	},
  	timeView: {
  		width: '30%',
  		height: 50
  	},
	upcomingName: {
    	fontFamily: 'latoBold',
    	fontSize: 34,
    	color: '#ff2e63',
    	fontWeight: '500',
    	paddingVertical: 5,
    	textAlign: 'center'
  	},
  	pendingName: {
  		marginTop: 10,
    	fontFamily: 'latoBold',
    	fontSize: 34,
    	color: '#08d9d6',
    	fontWeight: '500',
    	paddingVertical: 5,
    	textAlign: 'center'
  	},
  	trainerInfo: {
    	paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '700',
    	color: '#FAFAFA',
  	},
  	rateView: {
    	width: '18%',
    	height: 50
  	},
  	buttonContainer: {
  		padding: 10,
    	height: 48,
    	backgroundColor: '#08d9d6',
    	flexDirection: 'column',
    	justifyContent: 'center'
  	},
  	denyContainer: {
  		padding: 10,
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
  	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35, 
		color: '#08d9d6', 
		lineHeight: 20
	}
})