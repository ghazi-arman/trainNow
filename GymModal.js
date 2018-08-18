import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TouchableWithoutFeedback} from 'react-native';
import firebase from 'firebase';
import { MapView, AppLoading} from 'expo';

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
    	if(this.state.selectedTrainer == trainer){
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
	          <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}} key={key}>
	            <View style={styles.certView}><Text style={styles.trainerInfo}>Certifications: {this.state.trainer.cert}</Text></View>
	            <View style={styles.certView}><Text style={styles.trainerInfo}>Bio: {this.state.trainer.bio}</Text></View>
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
	              <View style={styles.rateView}><Text style={styles.trainerInfo}>${trainer.rate}</Text></View>
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
		return (
		<MapView
			style={styles.map}
	        ref = {(mapView) => { _map = mapView; }}
	        region={{
	            latitude: this.state.gym.location.latitude,
	            longitude: this.state.gym.location.longitude,
	            latitudeDelta: 0.0422,
	            longitudeDelta: 0.0221
	        }}
	        pitchEnabled = {false} rotateEnabled = {false} scrollEnabled = {false} zoomEnabled = {false}>
            <MapView.Marker
                ref={marker => (this.marker = marker)}
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
	            <Text style={styles.hourDetails}>Trainers</Text>
	            <ScrollView style={styles.trainers}>
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
		backgroundColor: '#fff',
		borderRadius: 10,
	},
	gymName: {
    	fontFamily: 'latoBold',
    	fontSize: 30,
    	color: 'black',
    	fontWeight: '500',
    	marginTop: 15,
  	},
	nameContainer: {
	    height: '15%',
	    width: '100%',
	    borderTopLeftRadius: 10,
	    borderTopRightRadius: 10,
	    backgroundColor: '#A7DBD8',
	    flexDirection: 'row',
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
	trainerContainer: {
    	flexDirection: 'column',
    	justifyContent: 'flex-start',
    	alignItems: 'center'
  	},
	trainerRow: {
	    flexDirection: 'row',
	    justifyContent: 'center',
	    height: 50,
	    borderWidth: 1,
	    borderColor: 'black',
	    margin: 5
  	},
  	trainers: {
    	width: '100%',
    	height: '65%'
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
    	fontWeight: '700',
  	},
  	activeView: {
    	width: '25%',
    	height: 50
  	},
  	certView: {
    	width: '90%'
  	},
  	rateView: {
    	width: '15%',
    	height: 50
  	},
  	hourDetails: {
	    fontFamily: 'lato',
	    fontSize: 24,
	    color: 'black',
	    fontWeight: '400',
	    marginTop: 10,
	    marginBottom: 10
  	},
  	buttonContainer: {
    	height: 48,
    	backgroundColor: '#C51162',
    	flexDirection: 'column',
    	justifyContent: 'center'
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FFFFFF',
    	fontWeight: '700'
  	},
  	active:{
    	color: 'green'
  	},
  	away:{
    	color: 'red'
  	},
  	trainerView: {
    	width: '25%',
    	height: 50
  	},
});