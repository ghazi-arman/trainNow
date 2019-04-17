import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback, Image} from 'react-native';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
console.ignoredYellowBox = ['Setting a timer'];
const markerImg = require('./images/marker.png');
const loadingGif = require('./images/loading.gif');
const profileImg = require('./images/profile.png');
import COLORS from './Colors';

export class GymModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: 'null',
			gym: 'null',
			imagesLoaded: false
		};
		this.loadGym=this.loadGym.bind(this);
		this.loadMap=this.loadMap.bind(this);
	}

	componentDidMount(){
		this.loadGym(this.props.gymKey);
	}

	//Loads selected gyms Info from db
	async loadGym(gymKey){
		await firebase.database().ref('/gyms/' + gymKey).once('value', function(snapshot){
	   		this.setState({ gym: snapshot.val() });
      	}.bind(this));
      	this.loadImages();
  	}

  	loadImages(){
  		var gym = this.state.gym;
  		Object.keys(gym.trainers).map(function(key, index){
	    	firebase.storage().ref().child(key).getDownloadURL().then(function(url) { 
	   			gym.trainers[key].uri = url;
	   			this.setState({gym: gym});
	   		}.bind(this), function(error) {
	   			gym.trainers[key].uri = 'null';
	   			this.setState({gym: gym});
	   		}.bind(this));
	    }.bind(this));
	    this.setState({imagesLoaded: true});
  	}

  	//Deselects or selects trainer based on trainer clicked
  	setTrainer(trainer){
    	if(this.state.trainer == trainer){
      		return null;
    	}else{
      		return trainer;
    	}
  	}

  	renderStars(rating){
  		var star = [];
  		var numStars = 0;
  		while(rating >= 1){
  			star.push(<FontAwesome key={numStars}>{Icons.star}</FontAwesome>);
  			rating--;
  			numStars++;
  		}
  		if(rating > 0){
  			star.push(<FontAwesome key={numStars}>{Icons.starHalfFull}</FontAwesome>);
  			numStars++;
  		}
  		while(numStars < 5){
  			star.push(<FontAwesome key={numStars}>{Icons.starO}</FontAwesome>);
  			numStars++;
  		}
  		return star;
  	}

  	//Returns list of trainers with corresponding view
	getTrainers(){
		var trainers = this.state.gym.trainers;
		var trainersArr = [];
		
		Object.keys(trainers).map(function(key, index){
			var trainer = trainers[key];
			trainer.key = key;
			trainersArr.push(trainer);
		});

		trainersArr.sort(function(a,b) {
			if(a.active && b.active){
				return parseDouble(a.rating) - parseDouble(b.rating);
			}else if(b.active){
				return 1;
			}else{
				return -1;
			}
		});

		var trainersList = trainersArr.map(function(value){

	        var trainer = value;

	        //Get active status of trainer
	        var activeField;
	        if(trainer.active == true){
	          activeField = <Text style={[styles.rate, styles.active]}>Active - ${trainer.rate}/hr</Text>;
	        }else{
	          activeField = <Text style={[styles.rate, styles.away]}>Away</Text>;
	        }

	        if(trainer.uri === undefined){
	        	var imageHolder = (<View style={styles.imageContainer}><Image source={loadingGif} style={styles.imageHolder} /></View>);
	        }else if(trainer.uri == 'null'){
	        	var imageHolder = (<View style={styles.imageContainer}><Image source={profileImg} style={styles.imageHolder} /></View>);
	        }else{
	        	var imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: trainer.uri }} style={styles.imageHolder} /></View>);
	        }

	        var infoArea;
	        if(this.state.trainer == trainer.key){
	        	infoArea = (
	        		<View style={styles.infoArea}>
		        		<Text style={styles.info}>{trainer.bio}</Text>
		        		<Text style={styles.info}>Certs: {trainer.cert}</Text>
		        		<TouchableOpacity style={styles.buttonContainer} onPress={() => {this.props.setTrainer(trainer)}}>
		        			<Text style={styles.buttonText}>Book Now!</Text>
		        		</TouchableOpacity>
		        	</View>
	        	);
	        }else{
	        	infoArea = null;
	        }

	        //DOM Element for a trainer in gym modal
	        return(
	        <TouchableWithoutFeedback key={trainer.key} onPress={() => {this.setState({trainer: this.setTrainer(trainer.key)})}}>
		        <View style={styles.trainerContainer}>
		          	<View style={styles.trainerRow}>
		          		{imageHolder}
		            	<View style={styles.trainerInfoContainer}>
		              		<Text style={styles.trainerName}>{trainer.name}</Text>
		              		<View style={styles.ratingContainer}>
			              		<Text style={styles.icon}>{this.renderStars(trainer.rating)}</Text>
			              		{activeField}
			              	</View>
		            	</View>
		          	</View>
		          	{infoArea}
		        </View>
		    </TouchableWithoutFeedback>
	        );
    	}.bind(this));
		return trainersList;
	}

	//Loads map object
	loadMap(){
		return (
		<MapView
			style={styles.map}
	        region={{
	            latitude: this.state.gym.location.latitude,
	            longitude: this.state.gym.location.longitude,
	            latitudeDelta: 0.0422,
	            longitudeDelta: 0.0221
	        }}
	        pitchEnabled = {false} rotateEnabled = {false} scrollEnabled = {false} zoomEnabled = {false}>
            <MapView.Marker
                key={this.state.gym.key}
                coordinate={this.state.gym.location}>
                <Image source={markerImg} style={{width: 50, height: 50}} />
            </MapView.Marker>
		</MapView>);
	}

	render(){
		if(this.state.gym == 'null' || typeof this.state.gym.location === 'undefined' || typeof this.state.gym.location.latitude === 'undefined'){
			return <Expo.AppLoading />;
		}else{
			var map = this.loadMap();
			return(
				<View style={styles.modal}>
		            <View style={styles.nameContainer}>
		            	<Text style={styles.gymName}>{this.state.gym.name}</Text>
		            	<Text style={styles.hourDetails}>{this.state.gym.hours}</Text>
		            </View>
		            <View style={styles.mapContainer}>
		            	{map}
		            </View>
	            	<View style={styles.trainersContainer}>
		            	<ScrollView showsVerticalScrollIndicator={false}>
		             		{this.getTrainers()}
		            	</ScrollView>
		            </View>
	          </View>
			)
		}
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .9,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	gymName: {
    	fontSize: 30,
    	color: COLORS.WHITE,
    	fontWeight: '500'
  	},
	nameContainer: {
	    height: '15%',
	    width: '100%',
	    borderTopLeftRadius: 10,
	    borderTopRightRadius: 10,
	    backgroundColor: COLORS.PRIMARY,
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
	mapContainer: {
    	height: '20%',
    	width: '100%'
  	},
  	map: {
  		height: '100%',
  		width: '100%'
  	},
  	trainersContainer: {
  		height: '60%',
  		width: '95%',
  		flexDirection: 'row',
  		justifyContent: 'center',
  		paddingLeft: 22
  	},
  	trainerContainer: {
  		backgroundColor: COLORS.WHITE,
  		width: '95%',
  		minHeight: 100,
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  		borderRadius: 5,
  		borderWidth: 1,
  		borderColor: COLORS.PRIMARY,
	   	marginTop: 10
  	},
  	trainerRow: {
  		width: '90%',
	    flexDirection: 'row',
	    justifyContent: 'center',
	    alignItems: 'center',
	    marginTop: 10,
  	},
  	ratingRow: {
  		width: '90%',
  		flexDirection: 'row',
  		justifyContent: 'center',
  		alignItems: 'center',
  		marginTop: 10
  	},
  	infoArea: {
  		width: '95%',
  	},
  	info: {
  		fontSize: 16,
    	fontWeight: '500',
    	color: COLORS.PRIMARY,
    	margin: 5
  	},
  	buttonRow: {
  		width: '100%',
  		flexDirection: 'row', 
  		justifyContent: 'center',
  		marginTop: 10
  	},
  	imageContainer: {
		width: 90,
		height:90,
		borderRadius: 45,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 90,
		height: 90,
		borderRadius: 45
	},
  	trainerInfoContainer:{
    	width: '60%',
    	flexDirection: 'column',
    	justifyContent: 'space-around',
    	alignItems: 'center',
    	minHeight: 100,
  	},
  	ratingContainer: {
  		flexDirection: 'column',
  		justifyContent: 'flex-start',
  		alignItems: 'center'
  	},
  	trainerName: {
    	fontSize: 22,
    	fontWeight: '600',
    	color: COLORS.PRIMARY
  	},
  	rate: {
    	fontSize: 16,
    	fontWeight: '500',
    	color: COLORS.WHITE
  	},
  	hourDetails: {
	    fontSize: 20,
	    color: COLORS.WHITE,
	    fontWeight: '400',
	    marginTop: 5,
  	},
  	buttonContainer: {
    	height: 48,
    	backgroundColor: COLORS.SECONDARY,
    	flexDirection: 'column',
    	justifyContent: 'center',
    	margin: 10
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: COLORS.WHITE,
    	fontWeight: '700'
  	},
  	active:{
    	color: COLORS.SECONDARY
  	},
  	away:{
    	color: COLORS.RED
  	},
  	icon: {
  		color: COLORS.SECONDARY,
		fontSize: 15,
  	}
});