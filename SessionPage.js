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
  Alert
} from 'react-native';
import {Permissions, Location, Font, AppLoading, MapView} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';


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
	}

	getLocationAsync = async () => {

	    //grab user location and store it
	    let { status } = await Permissions.askAsync(Permissions.LOCATION);
	    let location = await Location.getCurrentPositionAsync({});
	    this.setState({
	      userRegion: {
	        latitude:  Number(JSON.stringify(location.coords.latitude)),
	        longitude: Number(JSON.stringify(location.coords.longitude)),
	        latitudeDelta: 0.0422,
	        longitudeDelta: 0.0221
	      }
	    });
  	};

  	//updates mapRegion object in state
	handleMapRegionChange = mapRegion => {
		this.setState({ mapRegion });
	};
	
	endSession(){
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.trainee)

		if(this.state.session.trainer == user.uid){
			if(this.state.session.traineeEnd){
				sessionRef.update({trainerEnd: true, end: new Date()});
				Actions.reset('rating');
			}else{
				sessionRef.update({trainerEnd: true});
			}
		}else{
			if(this.state.session.trainerEnd){
				sessionRef.update({traineeEnd: true, end: new Date()});
				Actions.reset('rating');
			}else{
				sessionRef.update({traineeEnd: true});
			}
		}
	}
	startSession(){
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.trainee)
		if(typeof this.state.session === 'undefined'){
			Alert.alert("Try Again Please. Server Problem");
			return;
		}

		if(this.state.session.trainer == user.uid){

			//If both are ready set metup true and start time
			if(this.state.session.traineeReady){
				sessionRef.update({trainerReady: true, met: true, start: new Date()});
			}else{
				sessionRef.update({trainerReady: true});
			}

			//Update session in state with changes just pushed
			sessionRef.on("value", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));

		}else{

			//If both are ready set metup true and start time
			if(this.state.session.trainerReady){
				sessionRef.update({traineeReady: true, met: true, start: new Date()});
			}else{
				sessionRef.update({traineeReady: true});
			}

			//Update session in state with changes just pushed
			sessionRef.on("value", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));
		}
	}

	// load font after render the page
	async componentDidMount() {

		this._interval = setInterval(() => {

			this.getLocationAsync();
			this.setState({mapRegion: this.state.userRegion});

			Font.loadAsync({
			  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
			});
			this.setState({ fontLoaded: true });

			var user = firebase.auth().currentUser;
			var sessionRef = firebase.database().ref('trainSessions');
			sessionRef.orderByKey().equalTo(user.uid).on("child_added", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));

			sessionRef.orderByChild('trainer').equalTo(user.uid).on("child_added", function(snapshot){
				this.setState({session: snapshot.val()});
			}.bind(this));

			if(typeof this.state.session.end !== 'undefined' && this.state.session.end != null){
				Actions.reset('rating');
			}

		}, 3000);
	}

	componentWillUnmount(){
		clearInterval(this._interval);
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
		if(this.state.session == 'null' || typeof this.state.session.location === 'undefined'|| this.state.userRegion == 'null' || typeof this.state.userRegion === 'undefined' || this.state.mapRegion == 'null'){
			return <Expo.AppLoading />
		}else{
			var displayDate = this.dateToString(this.state.session.start);

			var map, button, time, minutes, remaining, ready;
			var user = firebase.auth().currentUser;
			if(!this.state.session.met){
				time = <Text style={styles.bookDetails}>Start: {displayDate} </Text>;
				length = <Text style={styles.bookDetails}>Length: {this.state.session.duration} min</Text>;
				map = ( 
					<MapView
					  pitchEnabled = {false}
					  rotateEnabled = {false}
					  scrollEnabled = {false}
					  zoomEnabled = {false}
			          ref = {(mapView) => { _map = mapView; }}
			          style={styles.mapContainer}
			          onRegionChange={this.handleMapRegionChange}
			          region={this.state.mapRegion}
			          showUserLocation={true}
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
				if(this.state.session.traineeReady && user.uid == this.state.session.trainer){
					ready = <Text style={styles.smallText}>{this.state.session.trainee} is ready!</Text>;
				}else if(this.state.session.trainerReady && user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainer} is ready!</Text>
				}else if(user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainer} en route!</Text>;					
				}else{
					ready = <Text style={styles.smallText}>{this.state.session.trainee} en route</Text>;
				}
			}else{
				pendingDate = new Date(this.state.session.start);
				displayDate = this.dateToString(this.state.session.start);
				remaining = ((pendingDate.getTime() + (parseInt(this.state.session.duration) * 1000 * 60)) - new Date().getTime());
				minutes = Math.floor((remaining/1000)/60);
				time = <Text style={styles.bookDetails}>Start:{displayDate}</Text>;
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
				if(this.state.session.traineeEnd && user.uid == this.state.session.trainer){
					ready = <Text style={styles.smallText}>{this.state.session.trainee} ended!</Text>;
				}else if(this.state.session.trainerEnd && user.uid == this.state.session.trainee){
					ready = <Text style={styles.smallText}>{this.state.session.trainer} ended!</Text>
				}
			}
		}
		return (
			<KeyboardAvoidingView behavior="padding" style = {styles.container}>	
				<View style={styles.formContainer}>
					<View style={styles.infoContainer}>
						<Text style={styles.header}>Session Details</Text>
						<Text style={styles.bookDetails}>Trainer: {this.state.session.trainerName}</Text>
						<Text style={styles.bookDetails}>Trainee: {this.state.session.traineeName}</Text>
						{time}
						{length}
						{ready}
            		</View>
            		{map}
            		<View style={styles.buttonContain}>
            			{button}
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
  	smallText:{
  		fontSize: 15,
  		fontWeight: '300',
  		color: '#2980b9'
  	},
  	header: {
  		fontSize: 35,
  		fontWeight: '700',
  		textDecorationLine: 'underline'

  	},
	container: {
		flex: 1,
		backgroundColor: '#E0E4CC',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	formContainer: {
	    width: '100%',
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
  	mapContainer: {
  		width: '100%',
  		height: '40%'
  	},
  	buttonContain: {
  		width: '50%',
  		height: '20%'
  	},
  	infoContainer: {
  		height: '40%',
  		width: '80%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  	},	
	buttonContainer: {
		backgroundColor: '#2980b9',
		paddingVertical: 15,
		width: '100%',
		paddingTop: 15
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	}
});
