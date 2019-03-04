import React, {Component} from 'react';
import { Platform, StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { Permissions, Location, AppLoading, MapView } from 'expo';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Drawer from 'react-native-drawer';
import { SideMenu } from './SideMenu';
import { GymModal } from './GymModal';
import { BookModal } from './BookModal';
console.ignoredYellowBox = ['Setting a timer'];

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
      modalPresent: false,
      menuOpen: false
    }

    this.setTrainer=this.setTrainer.bind(this);
    this.setLocation=this.setLocation.bind(this);
    this.checkSessions=this.checkSessions.bind(this);
    this.checkRead=this.checkRead.bind(this);
    this.loadGyms=this.loadGyms.bind(this);
    this.toggleMenu=this.toggleMenu.bind(this);
  }

  componentWillUnmount(){
    firebase.database().ref('trainSessions').off();
    firebase.database().ref('pendingSessions').off();
    firebase.database().ref('gyms').off()
  }

  componentDidMount() {

    if(!this.state.locationLoaded){
      this.getLocationAsync();
    }

    //get gyms from db
    this.loadGyms();

    var user = firebase.auth().currentUser;

    //Checks for sessions in progress and unread messages/sessions
    this.checkSessions(user.uid);
    this.goToRating(user.uid);
    this.checkRead(user.uid);
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
    sessionRef.orderByChild('trainee').equalTo(userKey).on('value', function(snapshot){
      snapshot.forEach(function(child){
        var session = child.val();
        if(session.end != null && session.traineeRating == null){
          Actions.reset('rating', {session: child.key});
        }
      });
    });
    sessionRef.orderByChild('trainer').equalTo(userKey).on('value', function(snapshot){
      snapshot.forEach(function(child){
        var session = child.val();
        if(session.end != null && session.trainerRating == null){
          Actions.reset('rating', {session: child.key});
        }
      });
    });
  }

  //Checks for Sessions in Progress and routes to appropriate page
  checkSessions(userKey){
      //Check for Session in Progress
      var sessionRef = firebase.database().ref('trainSessions');
      var currDate = new Date();
      sessionRef.orderByChild('trainee').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(new Date(session.start) < currDate && session.traineeRating == null){
            this.setState({currentSession: child.key});
          }
        }.bind(this));
      }.bind(this));

      sessionRef.orderByChild('trainer').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(new Date(session.start) < currDate && session.trainerRating == null){
            this.setState({currentSession: child.key});
          }
        }.bind(this));
      }.bind(this));
  }

  //Checks for unread sessions and sets unread in state to true if they exist
  checkRead(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = pendingSession = null;
    
    //Only need to send trainers a notification for pending Sessions
    pendingRef.orderByChild('trainer').equalTo(userKey).on('value', function(snapshot) {
      snapshot.forEach(function(child){
        var pendingSession = child.val();
        if(pendingSession.read == false){
            this.setState({unRead: true});
        }
      }.bind(this));
    }.bind(this));

    //Only need to send trainees a notification for accepted Sessions
    acceptRef.orderByChild('trainee').equalTo(userKey).on('value', function(snapshot) {
      snapshot.forEach(function(child){
        var acceptSession = child.val();
        if(acceptSession.read == false){
            this.setState({unRead: true});
        }
      }.bind(this));
    }.bind(this));

  }

  //Load gyms from db for MapView
  loadGyms(){
    var gymsRef = firebase.database().ref('gyms');
    gymsRef.on('value', function(data) {
      var items= [];
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

  toggleMenu(){
    if(this.state.menuOpen == true){
      this.setState({menuOpen: false});
    }else{
      this.setState({menuOpen: true});
    }
  }

  //Hide Modal Functions
  hidegymModal = () => this.setState({ gymModal: false, modalPresent: false });
  hidebookModal = () => this.setState({ bookModal: false, bookingTrainer: 'null', modalPresent: false });

  render() {
    if(this.state.mapRegion === null || this.state.gymLoaded == false || this.state.mapRegion.latitude == undefined){
      return <Expo.AppLoading />;
    }

    if(this.state.unRead && !this.state.modalPresent){
      Alert.alert(
        'You have a new Session!',
        '',
        [
            {text: 'View', onPress: () => Actions.modal()}
      ]);
      this.state.modalPresent = true;
    }

    var alertBox = null;
    if(this.state.currentSession != null){
      alertBox = (
        <View style={styles.alertBox}>
          <TouchableOpacity onPress = {() => Actions.session({session: this.state.currentSession})}>
            <Text style={styles.alertText}>Enter Current Session!</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Drawer
        open={this.state.menuOpen}
        content={<SideMenu />}
        type="overlay"
        openDrawerOffset={0.15}
        tapToClose={true}
        onClose={() => this.setState({menuOpen: false})}>
        <View style={styles.container}>
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
            <Text style={styles.buttonText} onPress={this.toggleMenu}>
              <FontAwesome>{Icons.gear}</FontAwesome>
            </Text>
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
      </Drawer>
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
  },
  buttonText: {
    marginTop: 45,
    marginLeft: 20,
    fontSize: 35, 
    color: '#08d9d6', 
  }
});
