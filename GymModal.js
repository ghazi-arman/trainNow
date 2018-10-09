import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback} from 'react-native';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';
import { PROVIDER_GOOGLE } from 'react-native-maps'

export class GymModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: 'null',
			gym: 'null'
		};
		this.loadGym=this.loadGym.bind(this);
		this.loadMap=this.loadMap.bind(this);
	}

	componentDidMount(){
		this.loadGym(this.props.gymKey);
	}

	//Loads selected gyms Info from db
	loadGym(gymKey){
	    firebase.database().ref('/gyms/' + gymKey).once('value', function(snapshot){
        this.setState({
          gym: snapshot.val()
        });
      }.bind(this));
  	}

  	//Deselects or selects trainer based on trainer clicked
  	extendTrainer(trainer){
    	if(this.state.trainer == trainer){
      		return null;
    	}else{
      		return trainer;
    	}
  	}

  	//Returns list of trainers with corresponding view 
	getTrainers(){
		var trainers = this.state.gym.trainers;
		var trainersList = Object.keys(trainers).map(function(key, index){
	        var trainer = trainers[key];
	        trainer.key = key;

	        //Sets up bio and certifications area if a trainer is selected in gym modal
	        if(this.state.trainer != null && this.state.trainer.key == key){
	        var biocertField = (
	          <View style={styles.biocert} key={key}>
	            <View style={styles.certView}><Text style={styles.biocertTitle}>Certifications</Text><Text style={styles.biocertText}>{this.state.trainer.cert}</Text></View>
	            <View style={styles.certView}><Text style={styles.biocertTitle}>Trainer Bio</Text><Text style={styles.biocertText}>{this.state.trainer.bio}</Text></View>
	          </View>);
	        }

	        //Get active status of trainer
	        var activeField;
	        if(trainer.active == true){
	          activeField = <View style={styles.activeView}><Text style={[styles.trainerInfo, styles.active]}>Active</Text></View>
	        }else{
	          activeField = <View style={styles.activeView}><Text style={[styles.trainerInfo, styles.away]}>Away</Text></View>
	        }

	        //DOM Element for a trainer in gym modal
	        return(
	        <View style={styles.trainerContainer} key={key}>
	        <TouchableWithoutFeedback onPress={() => this.setState({trainer: this.extendTrainer(trainer)})}>
	          <View style={styles.trainerRow} key={trainer.key}>
	            <View style={styles.trainerInfoContainer}>
	              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{trainer.name}</Text></View>
	              <View style={styles.rateView}><Text style={styles.rateInfo}>${trainer.rate}</Text></View>
	              {activeField}
	            </View> 
	            <View style={{width: '25%', height: 50}}>
	              <TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.props.setTrainer(trainer)}>
	                <Text 
	                  style={styles.buttonText}
	                >
	                Book Now!
	                </Text>
	              </TouchableOpacity>
	            </View>
	          </View>
	        </TouchableWithoutFeedback>
	        {biocertField}
	        </View>

	        );
    	}.bind(this));
		return trainersList;
	}

	//Loads map object
	loadMap(){
		// var mapStyle = [{"elementType":"geometry","stylers":[{"color":"#1d2c4d"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#8ec3b9"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#1a3646"}]},{"featureType":"administrative.country","elementType":"geometry.stroke","stylers":[{"color":"#4b6878"}]},{"featureType":"administrative.land_parcel","elementType":"labels.text.fill","stylers":[{"color":"#64779e"}]},{"featureType":"administrative.province","elementType":"geometry.stroke","stylers":[{"color":"#4b6878"}]},{"featureType":"landscape.man_made","elementType":"geometry.stroke","stylers":[{"color":"#334e87"}]},{"featureType":"landscape.natural","elementType":"geometry","stylers":[{"color":"#023e58"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#283d6a"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#6f9ba5"}]},{"featureType":"poi","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"color":"#023e58"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#3C7680"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#304a7d"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#98a5be"}]},{"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#2c6675"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#255763"}]},{"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#b0d5ce"}]},{"featureType":"road.highway","elementType":"labels.text.stroke","stylers":[{"color":"#023e58"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#98a5be"}]},{"featureType":"transit","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"transit.line","elementType":"geometry.fill","stylers":[{"color":"#283d6a"}]},{"featureType":"transit.station","elementType":"geometry","stylers":[{"color":"#3a4762"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#0e1626"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#4e6d70"}]}]
		return (
		<MapView
			style={styles.map}
			// customMapStyle={mapStyle}
			provider={PROVIDER_GOOGLE}
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
			return <Expo.AppLoading />
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
	            <ScrollView contentContainerStyle={styles.trainers}>
	              {this.getTrainers()}
	            </ScrollView>
	          </View>
			)
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
	trainerRow: {
	    flexDirection: 'row',
	    justifyContent: 'space-between',
	    height: 50,
	    borderWidth: 1,
	   	borderColor: '#08d9d6',
	   	marginTop: 10
  	},
  	trainers: {
    	width: '100%',
    	height: '65%',
    	flexDirection: 'column',
    	justifyContent: 'space-between',
    	alignItems: 'center'
  	},
  	trainerContainer: {
  		width: '90%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center'
  	},
  	trainerInfoContainer:{
    	width: '70%',
    	flexDirection: 'row',
    	justifyContent: 'space-around',
    	height: 50
  	},
  	trainerInfo: {
  		paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '600',
    	color: '#FAFAFA'
  	},
  	rateInfo: {
  		paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '600',
    	color: '#08d9d6'
  	},
  	biocertTitle: {
  		fontSize: 17,
  		fontWeight: '700',
  		textAlign: 'center',
  		color: '#08d9d6'
  	},
  	biocertText: {
  		fontSize: 15,
  		fontWeight: '400',
  		textAlign: 'center',
  		color: '#FAFAFA'
  	},
  	biocert: {
  		flexDirection: 'row',
  		justifyContent: 'center',
  		alignItems: 'flex-start',
	    width: '90%',
	    backgroundColor: '#252a34',
	    padding: 5
  	},
  	activeView: {
    	width: '32%',
    	height: 50
  	},
  	certView: {
    	width: '50%'
  	},
  	rateView: {
    	width: '18%',
    	height: 50
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
    	justifyContent: 'center'
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
  	trainerView: {
    	width: '50%',
    	height: 50
  	},
});