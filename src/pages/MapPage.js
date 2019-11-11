import React, {Component} from 'react';
import { Image, StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import * as Permissions from 'expo-permissions';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Drawer from 'react-native-drawer';
import bugsnag from '@bugsnag/expo';
import { SideMenu } from '../components/SideMenu';
import { ManagedSideMenu } from '../components/ManagedSideMenu';
import { GymModal } from '../modals/GymModal';
import { BookModal } from '../modals/BookModal';
import { ScheduleModal } from '../modals/ScheduleModal';
import COLORS from '../components/Colors';
import { loadUser, getLocation, loadGyms, goToPendingRating, loadCurrentSession, checkForUnreadSessions } from '../components/Functions';
const markerImg = require('../images/marker.png');
const loading = require('../images/loading.gif');

export class MapPage extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedGym: {},
      currentSession: null,
      locationLoaded: false,
      gymModal: false,
      bookModal: false,
      scheduleModal: false,
      unread: false,
      modalPresent: false,
      menuOpen: false
    }
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.userRegion || !this.state.mapRegion) {
      const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION);
      if (status === 'granted') {
        const location = await getLocation();
        this.setState({ userRegion: location, mapRegion: location });
      }
    }
    if (!this.state.gyms || !this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        await goToPendingRating(user.trainer, firebase.auth().currentUser.uid);
        const gyms = await loadGyms();
        const currentSession = await loadCurrentSession(user.trainer, firebase.auth().currentUser.uid);
        const unread = await checkForUnreadSessions(user.trainer, firebase.auth().currentUser.uid);
        this.setState({gyms, user, currentSession, unread });
      } catch(error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the map.');
      }
    }
  }

  handleMapRegionChange = mapRegion => {
    if(this.state.regionSet){
      this.setState({ mapRegion });
    }else{
      return;
    }
  };

  showModal = (type, option) => {
    if(type === 'gym'){
      this.setState({
        bookModal: false,
        scheduleModal: false,
        gymModal: true,
        modalPresent: true,
        selectedGym: option
      });
    }

    if(type === 'book'){
      this.setState({
        gymModal: false,
        scheduleModal: false,
        bookingTrainer: option,
        modalPresent: true
      });
      setTimeout(() => this.setState({bookModal: true}), 800);
    }

    if(type === 'schedule'){
      this.setState({
        gymModal: false,
        bookModal: false,
        scheduleTrainer: option,
        modalPresent: true,
      });
      setTimeout(() => this.setState({scheduleModal: true}), 800);
    }
  }

  setTrainer = (trainer) => {
    this.showModal('book', trainer);
  }

  viewSchedule = (trainer) => this.showModal('schedule', trainer);

  setLocation = () => {
    if(this.state.userRegion){
      _map.animateToRegion(this.state.userRegion, 499);
    }
  }

  toggleMenu = () => {
    if(this.state.menuOpen){
      this.setState({menuOpen: false});
    }else{
      this.setState({menuOpen: true});
    }
  }

  hidegymModal = () => this.setState({ gymModal: false, modalPresent: false });
  hidebookModal = () => this.setState({ bookModal: false, modalPresent: false });
  hidescheduleModal = () => this.setState({ scheduleModal: false, modalPresent: false});

  hideandOpen = () => {
    this.setState({scheduleModal: false, bookModal: false})
    setTimeout(() => this.setState({gymModal: true}), 500);
  }

  render() {
    if(!this.state.mapRegion || !this.state.gyms || !this.state.user) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }

    if (this.state.unread && !this.state.modalPresent) {
      Alert.alert(
        `Hello ${this.state.user.name}`,
        'You have a new session!',
        [
          {text: 'Close'},
          {text: 'View', onPress: () => Actions.CalendarPage()}
        ]
      );
      this.state.modalPresent = true;
    }

    let alertBox, menu;
    if (this.state.currentSession) {
      alertBox = (
        <Text style={styles.sessionText} onPress={() => Actions.SessionPage({session: this.state.currentSession})}>
          Enter Session!
        </Text>
      );
    }

    if (this.state.user.type != 'owner') {
      menu = <SideMenu />;
    } else {
      menu = <ManagedSideMenu />;
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
            <TouchableOpacity style={{width: 60, height: 60}}>
              <Text style={styles.menuIcon} onPress={this.toggleMenu}>
                <FontAwesome name="bars" size={50} />
              </Text>
            </TouchableOpacity>
            {alertBox}
            {this.state.gyms.map(marker => (
              <MapView.Marker
                ref={marker => (this.marker = marker)}
                key={marker.key}
                coordinate={marker.location}
                onPress={() => this.showModal('gym', marker)}
              >
                <Image source={markerImg} style={{width: 50, height: 50}} />
              </MapView.Marker>
            ))}
          </MapView>

          <Modal isVisible={this.state.gymModal}
          onBackdropPress={this.hidegymModal}>
            <GymModal gymKey={this.state.selectedGym.key} setTrainer={this.setTrainer} viewSchedule={this.viewSchedule} hide={this.hidegymModal} />
          </Modal>

          <Modal isVisible={this.state.bookModal}
          onBackdropPress={this.hidebookModal}>
            <BookModal trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')} hideandOpen={this.hideandOpen} />
          </Modal>

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
  menuIcon: {
    position: 'absolute',
    marginTop: 30,
    marginLeft: 20,
    fontSize: 50, 
    color: COLORS.PRIMARY, 
  },
  sessionText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.SECONDARY,
    marginTop: 10
  },
  loading: {
    width: '100%',
    resizeMode: 'contain'
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
