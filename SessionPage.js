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
		this.startSession=this.startSession.bind(this);
	}

	backtomap() {
		Actions.reset('map');
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
	
	startSession(){
		var user = firebase.auth().currentUser;
		var sessionRef = firebase.database().ref('/trainSessions/' + this.state.session.trainee)

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

		}, 10000);
	}

	componentWillUnmount(){
		clearInterval(this._interval);
	}

	render() {
		if(this.state.session == 'null' || typeof this.state.session.location === 'undefined'|| this.state.userRegion == 'null' || typeof this.state.userRegion === 'undefined' || this.state.mapRegion == 'null'){
			return <Expo.AppLoading />
		}else{
			var pendingDate = new Date(this.state.session.start);
        	var hour = pendingDate.getHours();
        	var minute = pendingDate.getMinutes();
        	var abbr;
        	if(minute < 10){
        		minute = "0" + minute;
        	}
        	if(hour == 0){
        		hour = 12;
        	}
        	if(hour > 12){
          		hour = hour - 12;
          		abbr = "PM";
        	}else{
          		abbr = "AM"
        	}
			var map, button, time, minutes, remaining;
			if(!this.state.session.met){
				time = <Text style={styles.bookDetails}>Start: {hour}:{minute} {abbr} </Text>;
				length = <Text style={styles.bookDetails}>Length: {this.state.session.duration} min</Text>;
				map = ( 
					<MapView
					  pitchEnabled = {false}
					  rotateEnabled = {false}
					  scrollEnabled = {false}
					  zoomEnabled = {false}
			          ref = {(mapView) => { _map = mapView; }}
			          style={styles.formContainer}
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
			}else{
				remaining = ((pendingDate.getTime() + (parseInt(this.state.session.duration) * 1000 * 60)) - new Date().getTime());
				minutes = Math.floor((remaining/1000)/60);
				time = <Text style={styles.bookDetails}>Session Started at {hour}:{minute} {abbr} </Text>;
				length = <Text style={styles.bookDetails}>You have {minutes} min left</Text>;
				button = (
					<TouchableOpacity 
						style={styles.buttonContainer}
						onPressIn={this.startSession}>
						<Text 
							style={styles.buttonText}
							>End Session</Text>
					</TouchableOpacity>
				);
				map = null;
			}
		}
		return (
			<KeyboardAvoidingView 
				behavior="padding"
				style = {styles.container}
				>
				<TouchableOpacity 
					style={styles.gobackContainer}
					onPressIn={this.backtomap}>
					<Text 
						style={styles.gobackText}
						>	 Back to map</Text>
				</TouchableOpacity>			
				<View style = {styles.formContainer}>
					<Text style={styles.bookDetails}>Trainer: {this.state.session.trainerName}</Text>
					<Text style={styles.bookDetails}>Trainee: {this.state.session.traineeName}</Text>
					{time}
					{length}
            		{map}
				</View>
				{button}
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	bookDetails:{
    	fontSize: 20,
    	fontWeight: '500'
  	},
	container: {
		flex: 1,
		backgroundColor: '#3498db',
	},
	gobackContainer: {
		backgroundColor: '#2980b9',
		paddingVertical: 20,
		top: '5%'
	},
	formContainer: {
	    position: 'relative',
	    marginLeft: '10%',
	    height: '80%',
	    width: '80%',
	    marginTop: 30
  	},
	gobackText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	logo: {
		width: 100,
		height: 100,
	},
	logoContainer: {
		alignItems: 'center',
		flexGrow: 1,
		justifyContent: 'center',
	},
	title: {
		color: "#FFF",
		marginTop: 10,
		textAlign: 'center',
		opacity: 0.9,
	},		
	buttonContainer: {
		backgroundColor: '#2980b9',
		paddingVertical: 15,
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	}
});
