import React, {Component} from 'react';
import { Platform, StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { Permissions, Location, AppLoading, MapView } from 'expo';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { GymModal } from './GymModal'
import { BookModal } from './BookModal';
import { BottomBar } from './BottomBar';

export class Map extends Component {
  // Initialize Firebase
  constructor(props) {
    super(props);

    this.state = {
      userRegion: {},
      mapRegion: {},
      gyms: [],
      gymLoaded: false,
      selectedGym: 'null',
      bookingTrainer: 'null',
      currentSession: null,
      locationLoaded: false,
      gymModal: false,
      bookModal: false,
      unRead: false,
      modalPresent: false
    }

    this.setTrainer=this.setTrainer.bind(this);
    this.setLocation=this.setLocation.bind(this);
    this.checkSessions=this.checkSessions.bind(this);
  }

  componentWillUnmount(){
    clearInterval(this._interval);
  }

  async componentDidMount() {

    if(!this.state.locationLoaded){
      this.getLocationAsync();
    }

    //get gyms from db
    this.loadGyms();

    var user = firebase.auth().currentUser;

    //Re Render every 10 seconds for pendingMessages
    this._interval = setInterval(() => {

   	  //Checks for sessions in progress and unread messages/sessions
      this.goToRating(user.uid);
      this.checkSessions(user.uid);

     	if(this.state.unRead && !this.state.modalPresent){
      	Alert.alert(
      		'You have a new Session!',
      		'',
      		[
        			{text: 'View', onPress: () => Actions.replace('modal')}
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

  goToRating(userKey){
    var sessionRef = firebase.database().ref('trainSessions');
    sessionRef.orderByChild('trainee').equalTo(userKey).once('child_added', function(snapshot){
      var session = snapshot.val();
      if(session.end != null && session.traineeRating == null){
        Actions.replace('rating', {session: snapshot.key});
      }
    });
    sessionRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot){
      var session = snapshot.val();
      if(session.end != null && session.trainerRating == null){
        Actions.replace('rating', {session: snapshot.key});
      }
    });
  }

  //Checks for Sessions in Progress and routes to appropriate page
  checkSessions(userKey){
      //Check for Session in Progress
      var sessionRef = firebase.database().ref('trainSessions');
      var currDate = new Date();
      sessionRef.orderByChild('trainee').equalTo(userKey).once('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.traineeEnd == false){
          this.setState({currentSession: snapshot.key});
        }
      }.bind(this));

      sessionRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot){
        var session = snapshot.val();
        if(new Date(session.start) < currDate && session.trainerEnd == false){
          this.setState({currentSession: snapshot.key});
        }
      }.bind(this));
  }

  //Checks for unread sessions and sets unread in state to true if they exist
  checkRead(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = pendingSession = null;
    
    //Only need to send trainers a notification for pending Sessions
    pendingRef.orderByChild('trainer').equalTo(userKey).on('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      if(typeof pendingSession.read !== 'undefined' && pendingSession.read == false){
        	this.setState({unRead: true});
      }
    }.bind(this));

    //Only need to send trainees a notification for accepted Sessions
    acceptRef.orderByChild('trainee').equalTo(userKey).on('child_added', function(snapshot) {
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
        //send info to the state
        this.setState({
          gyms: items,
          gymLoaded: true
        });
    }.bind(this));
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

  }

  setTrainer(trainer){
    if(!trainer.active){
      Alert.alert("Please select an active trainer!");
    }else{
      this.showModal('book', trainer);
    }
  }

  setLocation(){
    if(this.state.userRegion !== null){
      _map.animateToRegion(this.state.userRegion, 499);
    }
  }

  //Hide Modal Functions
  hidegymModal = () => this.setState({ gymModal: false });
  hidebookModal = () => this.setState({ bookModal: false, bookingTrainer: 'null' });

  render() {
    if(typeof this.state.mapRegion.latitude === 'undefined' || this.state.mapRegion === null || this.state.gymLoaded == false){
      return <Expo.AppLoading />;
    }

    var alertBox = null;
    if(this.state.currentSession != null){
      alertBox = (
        <View style={styles.alertBox}>
          <TouchableOpacity onPress = {() => Actions.replace('session', {session: this.state.currentSession})}>
            <Text style={styles.alertText}>Enter Current Session!</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View
        style={styles.container}
      >
        {alertBox}
        <MapView
          ref = {(mapView) => { _map = mapView; }}
          style={styles.map}
          onRegionChange={this.handleMapRegionChange}
          region={this.state.mapRegion}
          showsUserLocation={true}
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

        <BottomBar location={this.setLocation} account={() => Actions.replace('account')} pending={() => Actions.replace('modal')} history={() => Actions.replace('history')}/>

        {/*Gym Modal Info*/}
        <Modal isVisible={this.state.gymModal}
        onBackdropPress={this.hidegymModal}>
          <GymModal gymKey={this.state.selectedGym.key} setTrainer={this.setTrainer} />
        </Modal>

        {/* Booking Modal */}
        <Modal isVisible={this.state.bookModal}
        onBackdropPress={this.hidebookModal}>
          <BookModal trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')}/>
        </Modal>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  map: {
    height: '100%',
    width: '100%'
  },
  alertBox: {
    height: 80,
    width: '100%',
    backgroundColor: '#252a34',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 40
  },
  alertText: {
    fontSize: 20,
    color: '#08d9d6',
    fontWeight: '600',
  }
});
