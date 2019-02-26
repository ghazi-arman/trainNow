import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback, Image} from 'react-native';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
console.ignoredYellowBox = ['Setting a timer'];

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
	   		}.bind(this));
	    }.bind(this));
	    this.setState({imagesLoaded: true});
  	}

  	//Deselects or selects trainer based on trainer clicked
  	extendTrainer(trainer){
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
			if(b.active == true){
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
	          activeField = <Text style={[styles.rate, styles.active]}>Active</Text>;
	        }else{
	          activeField = <Text style={[styles.rate, styles.away]}>Away</Text>;
	        }

	        if(trainer.uri === undefined){
	        	var imageHolder = (<View style={styles.imageContainer}><Image source={require('./loading.gif')} style={styles.imageHolder} /></View>);

	        }else{
	        	var imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: trainer.uri }} style={styles.imageHolder} /></View>);

	        }

	        //DOM Element for a trainer in gym modal
	        return(
	        <View style={styles.trainerContainer} key={trainer.key}>
	          	<View style={styles.trainerRow} key={trainer.key}>
	          		{imageHolder}
	            	<View style={styles.trainerInfoContainer}>
	              		<Text style={styles.trainerName}>{trainer.name}</Text>
	              		<Text style={styles.rate}>${trainer.rate}</Text>
	              		{activeField}
	            	</View>
	          	</View>
	          	<View style={styles.ratingRow}>
	          		<Text style={styles.icon}>{this.renderStars(trainer.rating)}</Text>
	          	</View>
	          	<View style={styles.trainerRow}>
	          		<Text style={styles.rate}>{trainer.bio}</Text>
	          	</View> 
	          	<View style={styles.trainerRow}>
	          		<Text style={styles.rate}>{trainer.cert}</Text>
	          	</View>
	          	<View style={styles.buttonRow}>
	          		<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.props.setTrainer(trainer)}>
		                <Text style={styles.buttonText}>Book Now!</Text>
              		</TouchableOpacity>
              	</View>
	        </View>

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
                coordinate={this.state.gym.location} />
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
		            </View>
		            <View style={styles.mapContainer}>
		            	{map}
		            </View>
	            	<Text style={styles.hourDetails}>Hours: {this.state.gym.hours}</Text>
	            	<Text style={styles.trainerTitle}>Trainers</Text>
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
		backgroundColor: '#252a34',
		borderRadius: 10,
	},
	gymName: {
    	fontSize: 30,
    	color: '#08d9d6',
    	fontWeight: '500'
  	},
	nameContainer: {
	    height: '15%',
	    width: '100%',
	    borderTopLeftRadius: 10,
	    borderTopRightRadius: 10,
	    backgroundColor: '#252a34',
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
  		height: '50%',
  		width: '95%',
  		flexDirection: 'row',
  		justifyContent: 'center',
  		paddingLeft: 27
  	},
  	trainerContainer: {
  		width: '90%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center',
  		borderWidth: 1,
	   	borderColor: '#08d9d6',
	   	marginTop: 10
  	},
  	trainerRow: {
  		width: '90%',
	    flexDirection: 'row',
	    justifyContent: 'flex-start',
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
  	buttonRow: {
  		width: '100%',
  		flexDirection: 'row', 
  		justifyContent: 'center',
  		marginTop: 10
  	},
  	imageContainer: {
		width: "40%",
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 70,
		height: 70,
		borderWidth: 1,
		borderColor: '#ff2e63',
	},
  	trainerInfoContainer:{
    	width: '60%',
    	flexDirection: 'column',
    	justifyContent: 'space-around',
    	alignItems: 'center',
    	height: 80
  	},
  	trainerName: {
    	fontSize: 25,
    	fontWeight: '700',
    	color: '#FAFAFA'
  	},
  	rate: {
    	fontSize: 20,
    	fontWeight: '600',
    	color: '#FAFAFA'
  	},
  	hourDetails: {
	    fontSize: 16,
	    color: '#ff2e63',
	    fontWeight: '400',
	    marginTop: 10,
  	},
  	trainerTitle: {
	    fontSize: 24,
	    color: '#ff2e63',
	    fontWeight: '400',
	    marginTop: 5,
  	},
  	buttonContainer: {
    	height: 48,
    	backgroundColor: '#ff2e63',
    	flexDirection: 'column',
    	justifyContent: 'center',
    	marginBottom: 10
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FAFAFA',
    	fontWeight: '700'
  	},
  	active:{
    	color: '#08d9d6'
  	},
  	away:{
    	color: '#ff2e63'
  	},
  	icon: {
  		color: '#08d9d6',
		fontSize: 15,
  	}
});