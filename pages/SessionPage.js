import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import MapView from 'react-native-maps';
import * as Font from 'expo-font';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import geolib from 'geolib';
import COLORS from '../components/Colors';
import { sendMessage } from '../components/Functions';

export class SessionPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			session: 'null',
			mapRegion: 'null',
			userRegion: 'null',
		};
		this.endSession=this.endSession.bind(this);
		this.startSession=this.startSession.bind(this);
		this.goToMap=this.goToMap.bind(this);
	}

	// load font after render the page
	componentDidMount() {

		if(!this.state.fontLoaded){
			Font.loadAsync({
		  		fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
			});
			this.setState({ fontLoaded: true });
		}

		this.getLocationAsync();
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('trainSessions');
		sessionRef.orderByKey().equalTo(this.props.session).on("value", function(snapshot){
			snapshot.forEach(function(child){
				var currentSession = child.val();
				currentSession.key = child.key;
				this.setState({session: currentSession});
			}.bind(this));
		}.bind(this));

		if(this.state.session.end != null){
			Actions.RatingPage({session: this.state.session.key});
		}
	}

	componentWillUnmount(){
		firebase.database().ref('trainSessions').off();
	}

	getLocationAsync = async () => {

	    //grab user location and store it
	    let { status } = await Permissions.askAsync(Permissions.LOCATION);
	    let location = await Location.getCurrentPositionAsync({});
	    var loc = {
	    	latitude:  Number(JSON.stringify(location.coords.latitude)),
	        longitude: Number(JSON.stringify(location.coords.longitude)),
	        latitudeDelta: 0.0422,
	        longitudeDelta: 0.0221
	    }
	    this.setState({
	      userRegion: loc,
	      mapRegion: loc,
	    });
  	};

  async charge(traineeStripe, trainerStripe, amount, cut, uid){
		try{
			const idToken = await firebase.auth().currentUser.getIdToken(true);
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/charge/', {
				method: 'POST',
				headers: {
					Authorization: idToken
				},
				body: JSON.stringify({
				    charge: {
								user: uid,
				        amount: amount,
				        cut: cut,
				        traineeId: traineeStripe,
				        trainerId: trainerStripe,
				        currency: 'USD',
				    },
				}),
			});
			const data = await res.json();
			data.body = JSON.parse(data.body);
			if(data.body.message == 'Success'){
				message = `You were charged $ ${(amount/100).toFixed(2)} for your session with ${this.state.session.trainerName}. If this is not accurate please contact support.`
				sendMessage(this.state.session.traineePhone, message);
			}
			console.log(data);
		} catch(error){
			console.log(error);
		}
  }
	
	endSession(){
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.key);
		var duration = new Date() - new Date(this.state.session.start);
		var minutes = Math.floor((duration/1000)/60);
		var rate = ((parseInt(minutes) * (parseInt(this.state.session.rate) / 60)) * 100).toFixed(0);
		var payout = (parseInt(rate) - (parseInt(rate) * .17)).toFixed(0);
		console.log(rate);
		console.log(payout);

		if(this.state.session.trainer == user.uid){
			if(this.state.session.traineeEnd){
				sessionRef.update({trainerEnd: true, end: new Date()});
				sessionRef.once('value', function(snapshot){
					var session = snapshot.val();
					if(!session.paid){
						this.charge(this.state.session.traineeStripe, this.state.session.trainerStripe, rate, rate - payout, user.uid);
						sessionRef.update({paid: true});
					}
				}.bind(this));
				Actions.RatingPage({session: this.state.session.key});

			}else{
				sessionRef.update({trainerEnd: true});
			}
		}else{
			if(this.state.session.trainerEnd){
				sessionRef.update({traineeEnd: true, end: new Date()});
				sessionRef.once('value', function(snapshot){
					var session = snapshot.val();
					if(!session.paid){
						this.charge(this.state.session.traineeStripe, this.state.session.trainerStripe, rate, rate - payout, user.uid);
						sessionRef.update({paid: true});
					}
				}.bind(this));
				Actions.RatingPage({session: this.state.session.key});
			}else{
				sessionRef.update({traineeEnd: true});
			}
		}
	}
	startSession(){
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.key)
		if(typeof this.state.session === 'undefined'){
			Alert.alert("Try Again Please. Server Problem");
			return;
		}

		if(geolib.getDistance(this.state.userRegion, this.state.session.location) > 100){
			Alert.alert("You must be within 300 feet to press ready!");
			return;
		}

		if(this.state.session.trainer == user.uid){

			//If both are ready set metup true and start time
			if(this.state.session.traineeReady){
				sessionRef.update({trainerReady: true, met: true, start: new Date()});
			}else{
				sessionRef.update({trainerReady: true});
			}

		}else{

			//If both are ready set metup true and start time
			if(this.state.session.trainerReady){
				sessionRef.update({traineeReady: true, met: true, start: new Date()});
			}else{
				sessionRef.update({traineeReady: true});
			}
		}
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
	    if(hour == 0){
	    	hour = 12;
	    }

	    var displayDate = month + '-' + day + ' ' + hour + ':' + minute + abbr;
	    return displayDate;
	}

	goToMap(){
		Actions.reset('MapPage');
	}

	render() {
		if(this.state.session == 'null' || typeof this.state.session.location === 'undefined' || typeof this.state.userRegion === 'undefined' || this.state.mapRegion == 'null'){
			return <AppLoading />
		}else{

			var displayDate = this.dateToString(this.state.session.start);

			var map, button, time, minutes, remaining, ready, ownReady, ownEnd;
			var user = firebase.auth().currentUser;
			if(this.state.session.trainee == user.uid){
				description = <Text style={styles.bookDetails}>{this.state.session.trainerName} is training you!</Text>;
			}else{
				description = <Text style={styles.bookDetails}>You are training {this.state.session.traineeName}!</Text>;
			}
			if(!this.state.session.met){
				time = <Text style={styles.bookDetails}>{displayDate} </Text>;
				length = <Text style={styles.bookDetails}>{this.state.session.duration} min</Text>;
				map = ( 
					<MapView
					  pitchEnabled = {false}
					  rotateEnabled = {false}
					  scrollEnabled = {false}
					  zoomEnabled = {false}
			          style={styles.mapContainer}
			          region={this.state.mapRegion}
			          showsUserLocation={true}
			        >
			            <MapView.Marker
			                ref={this.state.session.trainer}
			                key={this.state.session.trainer}
			                coordinate={this.state.session.location}
						/>
						<MapView.Polyline
				    		coordinates={[
				        		{latitude: this.state.userRegion.latitude, longitude: this.state.userRegion.longitude},
				        		{latitude: this.state.session.location.latitude, longitude: this.state.session.location.longitude},
				    		]}
				    		strokeWidth={4}
						/>
			        </MapView>);
				button = (
					<TouchableOpacity 
						style={styles.buttonContainer}
						onPressIn={this.startSession}>
						<Text 
							style={styles.buttonText}
							>Start Session</Text>
					</TouchableOpacity>
				);

				//Gives info about whether trainer/trainee is ready or en route
				if(this.state.session.traineeReady && user.uid == this.state.session.trainer){
					ready = <Text style={styles.smallText}>{this.state.session.traineeName} is ready!</Text>;
				}else if(this.state.session.trainerReady && user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainerName} is ready!</Text>
				}else if(user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainerName} is en route!</Text>;					
				}else{
					ready = <Text style={styles.smallText}>{this.state.session.traineeName} is en route</Text>;
				}

				//Gives info about if user is ready or not
				if(this.state.session.traineeReady && user.uid == this.state.session.trainee){
					ownReady = <Text style={styles.smallText}>You are ready!</Text>;
				}else if(this.state.session.trainerReady && user.uid == this.state.session.trainer){
					ownReady = <Text style={styles.smallText}>You are ready!</Text>;
				}

			}else{
				pendingDate = new Date(this.state.session.start);
				displayDate = this.dateToString(this.state.session.start);
				remaining = ((pendingDate.getTime() + (parseInt(this.state.session.duration) * 1000 * 60)) - new Date().getTime());
				minutes = Math.max(Math.floor((remaining/1000)/60), 0);
				time = <Text style={styles.bookDetails}>{displayDate}</Text>;
				length = <Text style={styles.bookDetails}>You have {minutes} min left</Text>;
				button = (
					<TouchableOpacity 
						style={styles.buttonContainer}
						onPressIn={this.endSession}>
						<Text 
							style={styles.buttonText}
							>End Session</Text>
					</TouchableOpacity>
				);
				map = null;

				//Gives info about whether trainer/trainee is ready or en route
				if(this.state.session.traineeEnd && user.uid == this.state.session.trainer){
					ready = <Text style={styles.smallText}>{this.state.session.traineeName} has ended!</Text>;
				}else if(this.state.session.trainerEnd && user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainerName} has ended!</Text>
				}

				if(this.state.session.traineeEnd && user.uid == this.state.session.trainee){
					ownEnd = <Text style={styles.smallText}>Waiting for {this.state.session.trainerName} to end!</Text>;
				}else if(this.state.session.trainerEnd && user.uid == this.state.session.trainer){
					ownEnd = <Text style={styles.smallText}>Waiting for {this.state.session.traineeName} to end!</Text>;
				}
			}
		}
		return (
			<View style={styles.container}>
				<View style={styles.formContainer}>
				<Text style={styles.backButton} onPress={this.goToMap}>
          			<FontAwesome>{Icons.arrowLeft}</FontAwesome>
        		</Text>
					<View style={styles.infoContainer}>
						<Text style={styles.header}>Your Session</Text>
						{description}
						{time}
						{length}
						{ready}
            		</View>
            		{map}
            		<View style={styles.buttonContain}>
            			{button}
            			{ownReady}
            			{ownEnd}
            		</View>
				</View>
			</View>	
		);
	}
}


const styles = StyleSheet.create({
	bookDetails:{
    	fontSize: 18,
    	fontWeight: '500',
    	color: COLORS.PRIMARY
  	},
  	smallText:{
  		marginTop: 5,
  		fontSize: 15,
  		fontWeight: '300',
  		color: COLORS.SECONDARY,
  		textAlign: 'center'
  	},
  	header: {
  		fontSize: 30,
  		fontWeight: '700',
  		color: COLORS.PRIMARY
  	},
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	formContainer: {
	    width: '95%',
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
  	mapContainer: {
  		width: '90%',
  		height: '35%'
  	},
  	buttonContain: {
  		width: '50%',
  		height: '20%',
  		marginTop: 10,
  	},
  	infoContainer: {
  		height: '35%',
  		width: '80%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  	},	
	buttonContainer: {
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: '100%',
		paddingTop: 15,
		flexDirection: 'row',
		justifyContent: 'center'
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	  	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
		lineHeight: 20
	}
});
