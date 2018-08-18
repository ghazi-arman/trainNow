import React, {Component} from 'react';
import { Platform, StyleSheet, Text, View, Button, Alert, TouchableOpacity } from 'react-native';
import { Permissions, Location, AppLoading, MapView } from 'expo';
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
      user: {},
      gyms: [],
      pendingSessions: [],
      acceptSessions: [],
      selectedGym: 'null',
      bookingTrainer: 'null',
      userLoaded: false,
      locationLoaded: false,
      gymModal: false,
      pendingModal: false,
      bookModal: false,
      unRead: false,
      pendingLoaded: false,
      alertPresent: false
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
    }

    //get gyms from db
    var gyms = this.loadGyms();

    //send info to the state
    this.setState({
      gyms: gyms,
    });

    //Get user info for state
    var user = firebase.auth().currentUser;
    var usersRef = firebase.database().ref('users');
    usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
      this.setState({user: snapshot.val()});
    }.bind(this));


    //Re Render every 10 seconds for pendingMessages
    this._interval = setInterval(() => {

      this.checkSessions(user.uid);
      this.checkRead(user.uid);

      if(!this.state.pendingLoaded || this.state.unRead){
        //get pendingSessions from db
        var pending = this.loadPending(user.uid);

        //get Accepted Session from db
        var accepted = this.loadAccept(user.uid);

        this.state.pendingLoaded = true;

        //send info to the state
        this.setState({
          pendingSessions: pending,
          acceptSessions: accepted,
        });


        if(this.state.unRead){
          if(!this.state.alertPresent){
            Alert.alert(
            'You have a new Session!',
            '',
            [
              {text: 'View', onPress: () => {
                this.showModal('pending');
              }}  
            ]);
          }
          this.state.alertPresent = true;
        }
      }
    }, 2000);
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
      }, mapRegion: {
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
      sessionRef.orderByKey().equalTo(userKey).on('child_added', function(snapshot){
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
    acceptRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      if(typeof acceptSession.read !== 'undefined' && acceptSession.read == false){
        this.setState({unRead: true});
      }
    }.bind(this));

  }

  //Load Pending Sessions still awaiting accept by trainer
  loadPending(userKey){
    var pendingRef = firebase.database().ref('pendingSessions');
    var pendingSession = null;
    var pendingSessions = [];
    
    pendingRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      pendingSessions.push(pendingSession);
    }.bind(this));

    pendingRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      pendingSession = snapshot.val();
      pendingSessions.push(pendingSession);
    }.bind(this));

    return pendingSessions;
  }

  //Load accepted sessions in the future
  loadAccept(userKey){
    var unRead;
    var acceptRef = firebase.database().ref('trainSessions');
    var acceptSession = null;
    var acceptSessions = [];
    
    acceptRef.orderByChild('trainer').equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      acceptSessions.push(acceptSession);
    }.bind(this));

    acceptRef.orderByKey().equalTo(userKey).once('child_added', function(snapshot) {
      acceptSession = snapshot.val();
      acceptSessions.push(acceptSession);
    }.bind(this));

    return acceptSessions;
  }

  //mark all sessions shown to user as read in db
  markRead(){
    var user = firebase.auth().currentUser;
      this.state.pendingSessions.map(function(session){
        if(user.uid == session.trainer){
          firebase.database().ref('/pendingSessions/'+ session.trainee).update({
            read: true
          });
        }
      });
    this.state.acceptSessions.map(function(session){
      if(user.uid == session.trainee){
        firebase.database().ref('/trainSessions/'+ session.trainee).update({
          read: true
        });
      }
    });
    this.setState({unRead: false});
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
        selectedGym: option
      });
    }

    //open book modal
    if(type == 'book'){
      this.setState({
        gymModal: false,
        bookingTrainer: option
      });
      setTimeout(() => this.setState({bookModal: true}), 800);
    }

    //open pending modal
    if(type == 'pending'){
      this.markRead();
      this.setState({
        pendingModal: true,
      });
    }
  }

  setTrainer(trainer){
    this.showModal('book', trainer);
  }

  setLocation(){
    _map.animateToRegion(this.state.userRegion, 499);
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
    if(typeof this.state.userRegion.latitude === 'undefined' || this.state.userRegion === null){
      return <Expo.AppLoading />;
    }
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

        <BottomBar location={this.setLocation} account={this.showAccount} pending={() => this.showModal('pending')}/>

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
          <SessionModal pending={this.state.pendingSessions} accepted={this.state.acceptSessions} />
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
