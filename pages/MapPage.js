import React, {Component} from 'react';
import { Image, StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import { Permissions, Location, MapView } from 'expo';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Drawer from 'react-native-drawer';
import { SideMenu } from '../components/SideMenu';
import { ManagedSideMenu } from '../components/ManagedSideMenu';
import { GymModal } from '../modals/GymModal';
import { BookModal } from '../modals/BookModal';
import { ScheduleModal } from '../modals/ScheduleModal';
import COLORS from '../components/Colors';
import { loadUser } from '../components/Functions';
const markerImg = require('../images/marker.png');

export class MapPage extends Component {
  // Initialize Firebase
  constructor(props) {
    super(props);

    this.state = {
      userRegion: {},
      mapRegion: {},
      gyms: [],
      user: 'null',
      gymLoaded: false,
      selectedGym: 'null',
      bookingTrainer: 'null',
      currentSession: null,
      locationLoaded: false,
      gymModal: false,
      bookModal: false,
      scheduleModal: false,
      unRead: false,
      modalPresent: false,
      menuOpen: false
    }
    this.setTrainer=this.setTrainer.bind(this);
    this.viewSchedule=this.viewSchedule.bind(this);
    this.setLocation=this.setLocation.bind(this);
    this.checkSessions=this.checkSessions.bind(this);
    this.checkRead=this.checkRead.bind(this);
    this.loadGyms=this.loadGyms.bind(this);
    this.toggleMenu=this.toggleMenu.bind(this);
    this.hideandOpen=this.hideandOpen.bind(this);
  }

  async componentDidMount() {
    if(!this.state.locationLoaded){
      this.getLocationAsync();
    }

    // get gyms from db
    this.loadGyms();

    // Checks for sessions in progress and unread messages/sessions
    var userId = firebase.auth().currentUser.uid;
    this.checkSessions(userId);
    this.goToRating(userId);
    this.checkRead(userId);
    let user = loadUser(userId);
    this.setState({user});
  }

  async componentWillUnmount() {
    firebase.database().ref('trainSessions').off();
    firebase.database().ref('pendingSessions').off();
    firebase.database().ref('gyms').off();
  }

  //Gets user location and updates mapRegion in state
  getLocationAsync = async () => {

    //grab user location and store it
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    let location = await Location.getCurrentPositionAsync({});
    let locationObject = {
      latitude:  Number(JSON.stringify(location.coords.latitude)),
      longitude: Number(JSON.stringify(location.coords.longitude)),
      latitudeDelta: 0.0422,
      longitudeDelta: 0.0221
    };
    this.setState({
      userRegion: locationObject,
      mapRegion: locationObject,
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
    try {
      firebase.database().ref('trainSessions').orderByChild('trainee').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(session.end != null && session.traineeRating == null){
            Actions.RatingPage({session: child.key});
          }
        });
      });
      firebase.database().ref('trainSessions').orderByChild('trainer').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(session.end != null && session.trainerRating == null){
            Actions.RatingPage({session: child.key});
          }
        });
      });
    } catch (error) {
      console.log(error);
    }
  }

  //Checks for Sessions in Progress and routes to appropriate page
  checkSessions(userKey){
    try {
      var currDate = new Date();
      firebase.database().ref('trainSessions').orderByChild('trainee').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(new Date(session.start) < currDate && session.traineeRating == null){
            this.setState({currentSession: child.key});
          }
        }.bind(this));
      }.bind(this));
      firebase.database().ref('trainSessions').orderByChild('trainer').equalTo(userKey).on('value', function(snapshot){
        snapshot.forEach(function(child){
          var session = child.val();
          if(new Date(session.start) < currDate && session.trainerRating == null){
            this.setState({currentSession: child.key});
          }
        }.bind(this));
      }.bind(this));
    } catch (error) {
      console.log(error);
    }
  }

  //Checks for unread sessions and sets unread in state to true if they exist
  checkRead(userKey){
    try {
      //Trainer check
      firebase.database().ref('pendingSessions').orderByChild('trainer').equalTo(userKey).on('value', function(snapshot) {
        snapshot.forEach(function(child){
          var pendingSession = child.val();
          if(pendingSession.read == false && pendingSession.sentBy == 'trainee'){
              this.setState({unRead: true});
              return;
          }
        }.bind(this));
      }.bind(this));

      firebase.database().ref('pendingSessions').orderByChild('trainee').equalTo(userKey).on('value', function(snapshot) {
        snapshot.forEach(function(child){
          var pendingSession = child.val();
          if(pendingSession.read == false && pendingSession.sentBy == 'trainer'){
              this.setState({unRead: true});
              return;
          }
        }.bind(this));
      }.bind(this));

      firebase.database().ref('trainSessions').orderByChild('trainee').equalTo(userKey).on('value', function(snapshot) {
        snapshot.forEach(function(child){
          var acceptSession = child.val();
          if(acceptSession.read == false && acceptSession.sentBy == 'trainee'){
              this.setState({unRead: true});
              return;
          }
        }.bind(this));
      }.bind(this));
  
      firebase.database().ref('trainSessions').orderByChild('trainer').equalTo(userKey).on('value', function(snapshot) {
        snapshot.forEach(function(child){
          var acceptSession = child.val();
          if(acceptSession.read == false && acceptSession.sentBy == 'trainer'){
              this.setState({unRead: true});
              return;
          }
        }.bind(this));
      }.bind(this));
    } catch (error) {
      console.log(error);
    }
  }

  //Load gyms from db for MapView
  loadGyms(){
    try {
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
    } catch (error) {
      console.log(error);
    }
  }

  //ShowModal function to open up different modals
  showModal(type, option){

    //open gym modal
    if(type == 'gym'){
      this.setState({
        bookModal: false,
        scheduleModal: false,
        gymModal: true,
        modalPresent: true,
        selectedGym: option
      });
    }

    //open book modal
    if(type == 'book'){
      this.setState({
        gymModal: false,
        scheduleModal: false,
        bookingTrainer: option,
        modalPresent: true
      });
      setTimeout(() => this.setState({bookModal: true}), 800);
    }

    if(type == 'schedule'){
      this.setState({
        gymModal: false,
        bookModal: false,
        scheduleTrainer: option,
        modalPresent: true,
      });
      setTimeout(() => this.setState({scheduleModal: true}), 800);
    }

  }

  setTrainer(trainer){
    if(!trainer.active){
      Alert.alert("Please select an active trainer!");
    }else{
      this.showModal('book', trainer);
    }
  }

  viewSchedule(trainer){
    this.showModal('schedule', trainer);
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
  hidescheduleModal = () => this.setState({ scheduleModal: false, modalPresent: false});

  hideandOpen(){
    this.setState({scheduleModal: false, bookModal: false})
    setTimeout(() => this.setState({gymModal: true}), 500);
  }

  render() {
    if(this.state.mapRegion === null || this.state.gymLoaded == false || this.state.mapRegion.latitude == undefined || this.state.user == 'null'){
      return <Expo.AppLoading />;
    }

    if(this.state.unRead && !this.state.modalPresent){
      Alert.alert(
        'You have a new Session!',
        '',
        [
            {text: 'Close'},
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
    if(this.state.user.type != 'owner'){
      var menu = <SideMenu />;
    }else{
      var menu = <ManagedSideMenu />;
    }

    return (
      <Drawer
        open={this.state.menuOpen}
        content={menu}
        type="overlay"
        openDrawerOffset={0.3}
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
            <Text style={styles.menuIcon} onPress={this.toggleMenu}>
              <FontAwesome>{Icons.bars}</FontAwesome>
            </Text>
            {this.state.gyms.map(marker => (
                <MapView.Marker
                  ref={marker => (this.marker = marker)}
                  key={marker.key}
                  coordinate={marker.location}
                  onPress={() => {
                   this.showModal('gym', marker);
                  }}
                >
                  <Image source={markerImg} style={{width: 50, height: 50}} />
                </MapView.Marker>
            ))}
          </MapView>

          {/*Gym Modal Info*/}
          <Modal isVisible={this.state.gymModal}
          onBackdropPress={this.hidegymModal}>
            <GymModal gymKey={this.state.selectedGym.key} setTrainer={this.setTrainer} viewSchedule={this.viewSchedule} />
          </Modal>

          {/* Booking Modal */}
          <Modal isVisible={this.state.bookModal}
          onBackdropPress={this.hidebookModal}>
            <BookModal trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')} hideandOpen={this.hideandOpen} />
          </Modal>

          {/* Schedule Modal */}
          <Modal isVisible={this.state.scheduleModal}
          onBackdropPress={this.hidescheduleModal}>
            <ScheduleModal trainer={this.state.scheduleTrainer} hide={this.hidescheduleModal} hideandOpen={this.hideandOpen}/>
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
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 40
  },
  alertText: {
    fontSize: 20,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  menuIcon: {
    marginTop: 45,
    marginLeft: 20,
    fontSize: 50, 
    color: COLORS.PRIMARY, 
  }
});
