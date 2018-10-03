import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  KeyboardAvoidingView,
  TouchableOpacity,
  Alert,
  Picker
} from 'react-native';
import {Permissions, Location, Font, AppLoading, MapView} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';


export class RatingPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			session: 'null',
			rating: 'null',
		};
		this.rateSession=this.rateSession.bind(this);
	}

	backtomap() {
		Actions.reset('map');
	}

	componentWillUnmount(){
		clearInterval(this._interval);
	}

	// load font after render the page
	async componentDidMount() {

		this._interval = setInterval(() => {

			if(!this.state.fontLoaded){	
				Font.loadAsync({
				  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
				});
				this.setState({ fontLoaded: true });
			}

			var user = firebase.auth().currentUser;
			var sessionRef = firebase.database().ref('trainSessions');
			sessionRef.orderByKey().equalTo(user.uid).on("child_added", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));

			sessionRef.orderByChild('trainer').equalTo(user.uid).on("child_added", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));

		}, 2000);

	}

	rateSession(){
		var session = this.state.session;
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.trainee)
		
		var duration = new Date(this.state.session.end) - new Date(this.state.session.start);
		var minutes = Math.floor((duration/1000)/60);
		var rate = (parseInt(minutes) * (parseInt(this.state.session.rate) / 60)).toFixed(2);
		
		if(this.state.rating == 'null'){
			Alert.alert('Enter a rating!');
			return;
		}

		if(this.state.session.trainer == user.uid){
			sessionRef.update({trainerRating: this.state.rating});
			session.trainerRating = this.state.rating;
			firebase.database().ref('/pastSessions/' + user.uid).push({session});
			if(this.state.session.traineeRating){
				firebase.database().ref('/pastSessions/' + session.trainee).update({trainerRating: this.state.rating});
				sessionRef.remove();
			}
		}else{
			sessionRef.update({traineeRating: this.state.rating});
			session.traineeRating = this.state.rating;
			firebase.database().ref('/pastSessions/' + user.uid).push({session});
			if(this.state.session.trainerRating){
				firebase.database().ref('/pastSessions/' + session.trainer).update({traineeRating: this.state.rating});
				sessionRef.remove();
			}
		}
		Actions.reset('map');
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
			var displayDate = this.dateToString(this.state.session.end);
			var duration = new Date(this.state.session.end) - new Date(this.state.session.start);
			var minutes = Math.floor((duration/1000)/60);
			var rate = (parseInt(minutes) * (parseInt(this.state.session.rate) / 60)).toFixed(2);
		}
		return (
			<KeyboardAvoidingView behavior="padding" style = {styles.container}>	
				<View style={styles.formContainer}>
					<View style={styles.infoContainer}>
						<Text style={styles.header}>Rate Session!</Text>
						<Text style={styles.bookDetails}>Ended: {displayDate} </Text>
						<Text style={styles.bookDetails}>Total Time: {minutes} min</Text>
						<Text style={styles.bookDetails}>Total Cost: ${rate}</Text>
						<Picker
							style={styles.picker}
							itemStyle={{height: 60}}
						  	selectedValue={this.state.rating}
						  	onValueChange={(itemValue, itemIndex) => this.setState({rating: itemValue})}>
						  	<Picker.Item label="Rate Session (Scroll)" value='null' />
						  		<Picker.Item label='1' value='1' />
						  		<Picker.Item label='2' value='2' />
						  		<Picker.Item label='3' value='3' />
						  		<Picker.Item label='4' value='4' />
						  		<Picker.Item label='5' value='5' />
						</Picker>
					</View>
            		<View style={styles.buttonContain}>
            			<TouchableOpacity style={styles.buttonContainer} onPressIn={this.rateSession}>
							<Text style={styles.buttonText}>Rate Session</Text>
						</TouchableOpacity>
            		</View>
				</View>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	bookDetails:{
    	fontSize: 25,
    	fontWeight: '500',
  	},
  	header: {
  		fontSize: 35,
  		fontWeight: '700',
  		textDecorationLine: 'underline'

  	},
  	picker: {
		height: 60,
		borderWidth: 1,
		borderColor: '#08d9d6',
		width: '90%',
	},
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'center',
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
  	infoContainer: {
  		height: '70%',
  		width: '100%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  	},	
	buttonContainer: {
		backgroundColor: '#ff2e63',
		paddingVertical: 15,
		width: '100%'
	},
	buttonText: {
		textAlign: 'center',
		color: '#FAFAFA',
		fontWeight: '700'
	}
});
