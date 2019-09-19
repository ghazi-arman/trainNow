import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Font } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';


export class RatingPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			session: 'null',
			rating: 0,
		};
		this.rateSession=this.rateSession.bind(this);
		this.setRating=this.setRating.bind(this);
	}

	backtomap() {
		Actions.reset('MapPage');
	}

	componentWillUnmount(){
		firebase.database().ref('trainSessions').off();
	}

	// load font after render the page
	async componentDidMount() {
		if(!this.state.fontLoaded){	
			Font.loadAsync({
			  fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
			});
			this.setState({ fontLoaded: true });
		}
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('trainSessions');
		sessionRef.orderByKey().equalTo(this.props.session).once('value', function(snapshot){
			snapshot.forEach(function(child){
				var currentSession = child.val();
				currentSession.key = child.key;
				if(currentSession.trainee == user.uid && currentSession.traineeRating != null){
					Actions.reset('MapPage');
					return;
				}else if(currentSession.trainer == user.uid && currentSession.trainerRating != null){
					Actions.reset('MapPage');
					return;
				}
				this.setState({session: currentSession});
			}.bind(this));
		}.bind(this));
	}

	async rateSession(){
		var session;
		var user = firebase.auth().currentUser;
		var currSessionRef = firebase.database().ref('/trainSessions/' + this.state.session.key);
		var sessionRef = firebase.database().ref('trainSessions');
		var userRef = firebase.database().ref('users');
		firebase.database().ref('/users/' + user.uid + '/schedule/').child(this.state.session.key).remove();

		const sessionLoad = await sessionRef.orderByKey().equalTo(this.state.session.key).once('value', function(snapshot){
			snapshot.forEach(function(child){
				var currentSession = child.val();
				currentSession.key = child.key;
				session = currentSession;
			}.bind(this));
		}.bind(this));
		
		var duration = new Date(this.state.session.end) - new Date(this.state.session.start);
		var minutes = Math.floor((duration/1000)/60);
		var rate = (parseInt(minutes) * (parseInt(this.state.session.rate) / 60)).toFixed(2);
		
		if(this.state.rating == 0){
			Alert.alert('Enter a rating!');
			return;
		}

		if(this.state.session.trainer == user.uid){
			//update average rating of trainee in users table
			var trainee = null;
			const traineeRating = await userRef.orderByKey().equalTo(this.state.session.trainee).once('value', function(snapshot){
				snapshot.forEach(function(snapshotChild){
					trainee = snapshotChild.val();
				}.bind(this));
			}.bind(this));
			var newAvg = (((trainee.rating * trainee.sessions) + parseInt(this.state.rating)) / (trainee.sessions + 1)).toFixed(2);
			var traineeRef = firebase.database().ref('/users/' + session.trainee);
			traineeRef.update({rating: newAvg, sessions: trainee.sessions + 1});

			currSessionRef.update({trainerRating: this.state.rating});
			session.trainerRating = this.state.rating;
			firebase.database().ref('/pastSessions/' + user.uid + '/' + session.key + '/').set({session: session});

			if(session.traineeRating != null){
				firebase.database().ref('/pastSessions/' + this.state.session.trainee + '/' + session.key + '/session/').update({trainerRating: this.state.rating});
				currSessionRef.remove();
			}
		}else{
			//update average rating of trainer in users and gym table
			var trainer = null;
			const traineeRating = await userRef.orderByKey().equalTo(this.state.session.trainer).once('value', function(snapshot){
				snapshot.forEach(function(snapshotChild){
					trainer = snapshotChild.val();
				}.bind(this));
			}.bind(this));
			var newAvg = (((trainer.rating * trainer.sessions) + parseInt(this.state.rating)) / (trainer.sessions + 1)).toFixed(2);
			var trainerRef = firebase.database().ref('/users/' + session.trainer);
			trainerRef.update({rating: newAvg, sessions: trainer.sessions + 1});

			var gymRef = firebase.database().ref('/gyms/' + trainer.gym + '/trainers/' + this.state.session.trainer);
			gymRef.update({rating: newAvg});

			currSessionRef.update({traineeRating: this.state.rating});
			session.traineeRating = this.state.rating;
			firebase.database().ref('/pastSessions/' + user.uid + '/' + session.key + '/').set({session: session});
			if(session.trainerRating != null){
				firebase.database().ref('/pastSessions/' + this.state.session.trainer + '/' + session.key + '/session/').update({traineeRating: this.state.rating});
				currSessionRef.remove();
			}
		}
		Actions.reset('MapPage');
	}

	setRating = (key) => {
		this.setState({rating: key});
	}

	renderStar(number, outline){
		if(outline == false){
			return(
				<TouchableOpacity key={number} onPress={() => this.setRating(number)}>
	  				<Text style={styles.icon}><FontAwesome>{Icons.star}</FontAwesome></Text>
	  			</TouchableOpacity>
			);
		}else{
			return(
				<TouchableOpacity key={number} onPress={() => this.setRating(number)}>
  					<Text style={styles.icon}><FontAwesome>{Icons.starO}</FontAwesome></Text>
  				</TouchableOpacity>
			);
		}
	}

	renderStars(rating){
  		var star = [];
  		let numStars = 0;
  		while(rating >= 1){
  			numStars++;
  			star.push(this.renderStar(numStars, false));
  			rating--;
  		}
  		while(numStars < 5){
  			numStars++;
  			star.push(this.renderStar(numStars, true));
  		}
  		return star;
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

	    var displayDate = month + '-' + day + ' ' + hour + ':' + minute + abbr;
	    return displayDate;
	 }

	render() {
		if(this.state.session == 'null'){
			return <Expo.AppLoading />
		}else{
			var user = firebase.auth().currentUser;
			var displayDate = this.dateToString(this.state.session.end);
			var duration = new Date(this.state.session.end) - new Date(this.state.session.start);
			var minutes = Math.floor((duration/1000)/60);
			var rate = (parseInt(minutes) * (parseInt(this.state.session.rate) / 60)).toFixed(2);
			var payout = (parseFloat(rate) - (parseFloat(rate) * .2)).toFixed(2);

			if(this.state.session.trainer == user.uid){
				if(!this.state.session.managed){
					var cost = <Text style={styles.bookDetails}>Total Earned: ${payout}</Text>
				}else{
					var cost = null;
				}
			}else{
				var cost = <Text style={styles.bookDetails}>Total Cost: ${rate}</Text>;
			}
		}
		var stars = this.renderStars(this.state.rating);
		return (
			<View style = {styles.container}>	
				<View style={styles.formContainer}>
					<View style={styles.infoContainer}>
						<Text style={styles.header}>Rate Session!</Text>
						<Text style={styles.bookDetails}>Ended: {displayDate} </Text>
						<Text style={styles.bookDetails}>Total Time: {minutes} min</Text>
						{cost}
						<View style={styles.starContainer}>
							{stars}
						</View>
					</View>
            		<View style={styles.buttonContain}>
            			<TouchableOpacity style={styles.buttonContainer} onPressIn={this.rateSession}>
							<Text style={styles.buttonText}>Rate Session</Text>
						</TouchableOpacity>
            		</View>
				</View>
			</View>	
		);
	}
}


const styles = StyleSheet.create({
	bookDetails:{
    	fontSize: 25,
    	fontWeight: '500',
    	color: COLORS.PRIMARY
  	},
  	header: {
  		fontSize: 35,
  		fontWeight: '700',
  		color: COLORS.PRIMARY
  	},
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	formContainer: {
	    width: '80%',
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
  	buttonContain: {
  		width: '50%'
  	},
  	starContainer: {
  		flexDirection: 'row',
  		justifyContent: 'center',
  		alignItems: 'center',
  		marginTop: 10
  	},
  	infoContainer: {
  		height: '65%',
  		width: '100%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  	},	
	buttonContainer: {
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: '100%'
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	icon: {
  		color: COLORS.SECONDARY,
		fontSize: 35,
  	}
});
