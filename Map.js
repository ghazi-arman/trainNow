import React, {Component} from 'react';
import { Platform, StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { Permissions, Location, AppLoading, MapView } from 'expo';
import { PROVIDER_GOOGLE } from 'react-native-maps'
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { GymModal } from './GymModal'
import { BookModal } from './BookModal';
import { SessionModal } from './SessionModal';
import { BottomBar } from './BottomBar';

export class Map extends Component {
  // Initialize Firebase
  constructor(props) {
    super(props);

    this.state = {
      userRegion: {},
      mapRegion: {},
      gyms: [],
      selectedGym: 'null',
      bookingTrainer: 'null',
      locationLoaded: false,
      gymModal: false,
      pendingModal: false,
      bookModal: false,
      unRead: false,
      modalPresent: false
    }

    this.setTrainer=this.setTrainer.bind(this);
    this.setLocation=this.setLocation.bind(this);
  }

  componentWillUnmount(){
    clearInterval(this._interval);
  }

  async componentDidMount() {

   if(!this.state.locationLoaded){
      this.getLocationAsync();
      console.log('location');
   }

   //get gyms from db
   var gyms = this.loadGyms();

   //send info to the state
   this.setState({
      gyms: gyms,
   });

   var user = firebase.auth().currentUser;

   //Re Render every 10 seconds for pendingMessages
   this._interval = setInterval(() => {

   	//Checks for sessions in progress and unread messages/sessions
      this.checkSessions(user.uid);

     	if(this.state.unRead && !this.state.modalPresent){
      	Alert.alert(
      		'You have a new Session!',
      		'',
      		[
        			{text: 'View', onPress: () => {this.showModal('pending');}}
      	]);
      	this.state.modalPresent = true;
     	}else if(!this.state.unRead){
     		this.checkRead(user.uid);
     	}
    }, 500);
  }

  //Gets user location and updates mapRegion in state
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
      },
      mapRegion: {
        latitude:  Number(JSON.stringify(location.coords.latitude)),
        longitude: Number(JSON.stringify(location.coords.longitude)),
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      },
      locationLoaded: true,
    });
  };

  //updates mapRegion object in state
  handleMapRegionChange = mapRegion => {
    if(this.state.regionSet){
      this.setState({ mapRegion });
    }else{
      return;
    }
  };

  //Checks for Sessions in Progress and routes to appropriate page
  checkSessions(userKey){
      //Check for Session in Progress
      var sessionRef = firebase.database().ref('trainSessions');
      var currDate = new Date();
      sessionRef.orderByChild('trainee').equalTo(userKey).on('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.end == null){
          Actions.reset('session');
        }else if(session.end != null && session.traineeRating == null){
          Actions.reset('rating');
        }
      });

      sessionRef.orderByChild('trainer').equalTo(userKey).on('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.end == null){
          Actions.reset('session');
        }else if(session.end != null && session.trainerRating == null){
          Actions.reset('rating');
        }
      });
  }

  //Checks for unread sessions and sets unread in state to true if they exist
  checkRead(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = pendingSession = null;
    
    //Only need to send trainers a notification for pending Sessions
    pendingRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      if(typeof pendingSession.read !== 'undefined' && pendingSession.read == false){
        	this.setState({unRead: true});
      }
    }.bind(this));

    //Only need to send trainees a notification for accepted Sessions
    acceptRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      if(typeof acceptSession.read !== 'undefined' && acceptSession.read == false){
        	this.setState({unRead: true});
      }
    }.bind(this));

  }

  //Load gyms from db for MapView
  loadGyms(){
    var items = [];
    var gymsRef = firebase.database().ref('gyms');
    gymsRef.once('value', function(data) {
      data.forEach(function(dbevent) {
        var item = dbevent.val();
        item.key = dbevent.key;
        items.push(item);
      });
    });

    return items;
  }

  //ShowModal function to open up different modals
  showModal(type, option){
    
    //open gym modal
    if(type == 'gym'){
      this.setState({
        bookModal: false,
        gymModal: true,
        modalPresent: true,
        selectedGym: option
      });
    }

    //open book modal
    if(type == 'book'){
      this.setState({
        gymModal: false,
        bookingTrainer: option,
        modalPresent: true
      });
      setTimeout(() => this.setState({bookModal: true}), 800);
    }

    //open pending modal
    if(type == 'pending'){
      this.setState({
        pendingModal: true,
        modalPresent: true,
        unRead: false
      });
    }
  }

  setTrainer(trainer){
    this.showModal('book', trainer);
  }

  setLocation(){
    if(this.state.userRegion !== null){
      _map.animateToRegion(this.state.userRegion, 499);
    }
  }

  //Hide Modal Functions
  hidegymModal = () => this.setState({ gymModal: false });
  hidebookModal = () => this.setState({ bookModal: false, bookingTrainer: 'null' });
  hidependingModal = () => this.setState({pendingModal: false});

  //Go to account page
  showAccount() {
    Actions.account();
  }

  render() {
    if(typeof this.state.mapRegion.latitude === 'undefined' || this.state.mapRegion === null){
      return <Expo.AppLoading />;
    }
    // var mapStyle = [{"elementType":"geometry","stylers":[{"color":"#1d2c4d"}]},{"elementType":"labels.text.fill","stylers":[{"color":"#8ec3b9"}]},{"elementType":"labels.text.stroke","stylers":[{"color":"#1a3646"}]},{"featureType":"administrative.country","elementType":"geometry.stroke","stylers":[{"color":"#4b6878"}]},{"featureType":"administrative.land_parcel","elementType":"labels.text.fill","stylers":[{"color":"#64779e"}]},{"featureType":"administrative.province","elementType":"geometry.stroke","stylers":[{"color":"#4b6878"}]},{"featureType":"landscape.man_made","elementType":"geometry.stroke","stylers":[{"color":"#334e87"}]},{"featureType":"landscape.natural","elementType":"geometry","stylers":[{"color":"#023e58"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#283d6a"}]},{"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#6f9ba5"}]},{"featureType":"poi","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"poi.park","elementType":"geometry.fill","stylers":[{"color":"#023e58"}]},{"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#3C7680"}]},{"featureType":"road","elementType":"geometry","stylers":[{"color":"#304a7d"}]},{"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#98a5be"}]},{"featureType":"road","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#2c6675"}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#255763"}]},{"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#b0d5ce"}]},{"featureType":"road.highway","elementType":"labels.text.stroke","stylers":[{"color":"#023e58"}]},{"featureType":"transit","elementType":"labels.text.fill","stylers":[{"color":"#98a5be"}]},{"featureType":"transit","elementType":"labels.text.stroke","stylers":[{"color":"#1d2c4d"}]},{"featureType":"transit.line","elementType":"geometry.fill","stylers":[{"color":"#283d6a"}]},{"featureType":"transit.station","elementType":"geometry","stylers":[{"color":"#3a4762"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#0e1626"}]},{"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#4e6d70"}]}]
    return (
      <View
        style={styles.container}
      >
        <MapView
          ref = {(mapView) => { _map = mapView; }}
          style={styles.container}
          onRegionChange={this.handleMapRegionChange}
          region={this.state.mapRegion}
          showsUserLocation={true}
          // provider={PROVIDER_GOOGLE}
          // customMapStyle={mapStyle}
          onMapReady={() => {
            this.setState({ regionSet: true });
          }}
        >
          {this.state.gyms.map(marker => (
              <MapView.Marker
                ref={marker => (this.marker = marker)}
                key={marker.key}
                coordinate={marker.location}
                onPress={() => {
                 this.showModal('gym', marker);
                }} />
          ))}
        </MapView>

        <BottomBar location={this.setLocation} account={this.showAccount} pending={() => this.showModal('pending')} history={() => Actions.history()}/>

        {/*Gym Modal Info*/}
        <Modal isVisible={this.state.gymModal}
        onBackdropPress={this.hidegymModal}>
          <GymModal gymKey={this.state.selectedGym.key} setTrainer={this.setTrainer} />
        </Modal>

        {/* Booking Modal */}
        <Modal isVisible={this.state.bookModal}
        onBackdropPress={this.hidebookModal}>
          <BookModal trainer={this.state.bookingTrainer} gym={this.state.selectedGym}/>
        </Modal>

        {/*Pending Sessions Modal*/}
        <Modal isVisible={this.state.pendingModal}
        onBackdropPress={this.hidependingModal}>
          <SessionModal />
        </Modal>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
});
