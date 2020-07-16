import React, { Component } from 'react';
import {
  Image, StyleSheet, Text, View, Alert, TouchableOpacity, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import * as Permissions from 'expo-permissions';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Drawer from 'react-native-drawer';
import bugsnag from '@bugsnag/expo';
import geolib from 'geolib';
import SideMenu from '../components/SideMenu';
import ManagedSideMenu from '../components/ManagedSideMenu';
import Colors from '../components/Colors';
import {
  loadUser,
  getLocation,
  loadGyms,
  goToPendingRating,
  loadCurrentSession,
  checkForUnreadSessions,
  markSessionsAsRead,
  loadPendingSessions,
  loadAcceptedSessions,
  loadCurrentGroupSession,
  sortGymsByLocation
} from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import markerImg from '../images/marker.png';

export default class MapPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedGym: null,
      currentSession: null,
      unread: false,
      menuOpen: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {    
    if (!this.state.userRegion || !this.state.mapRegion) {
      const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION);
      if (permissions && status === 'granted') {
        const location = await getLocation();
        this.setState({ userRegion: location, mapRegion: location });
      } else {
        Alert.alert('You must allow this app to access your location before you can proceed. Please change your settings and restart the application.',
          '',
          [
            {
              text: 'Ok',
              onPress: () => {
                firebase.auth().signOut().then(() => {
                  Actions.reset('LoginPage');
                }, (error) => {
                  Alert.alert('Sign Out Error', error);
                });
              },
            },
          ]);
      }
    }
    if (!this.state.gyms || !this.state.user) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        await goToPendingRating(userId, user.type);
        const gyms = await loadGyms();
        const currentSession = await loadCurrentSession(userId, user.type);
        const currentGroupSession = await loadCurrentGroupSession(userId, user.type);
        const unread = await checkForUnreadSessions(userId, user.type);
        const pendingSessions = await loadPendingSessions(userId, user.type);
        const acceptSessions = await loadAcceptedSessions(userId, user.type);
        this.setState({
          gyms,
          user,
          currentSession,
          unread,
          pendingSessions,
          acceptSessions,
          currentGroupSession,
        });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the map.');
      }
    }
  }

  handleMapRegionChange = (mapRegion) => {
    if (this.state.regionSet) {
      this.setState({ mapRegion });
    }
  };

  setLocation = () => {
    if (this.state.userRegion) {
      this.map.animateToRegion(this.state.userRegion, 499);
    }
  }

  toggleMenu = () => {
    if (this.state.menuOpen) {
      this.setState({ menuOpen: false });
    } else {
      this.setState({ menuOpen: true });
    }
  }

  renderGyms = () => {
    const sortedGyms = sortGymsByLocation(this.state.gyms, this.state.userRegion);
    return sortedGyms.map((gym) => {
      return (
        <View style={styles.gymContainer} key={gym.key}>
          <Image style={styles.gymImage} source={markerImg} />
          <TouchableWithoutFeedback onPress={() => this.setState({ selectedGym: gym })}>
            <View style={styles.nameContainer} >
              <Text style={styles.gymName}>{gym.name}</Text>
              <Text style={styles.distance}>
                {(geolib.getDistance(
                  gym.location,
                  this.state.userRegion
                ) * Constants.metersToMilesMultiplier).toFixed(2)} miles away
              </Text>
            </View>
          </TouchableWithoutFeedback>
          <View style={styles.linkContainer}>
            <Text style={styles.link}>Details</Text>
          </View>
        </View>
      );
    });
  }

  render() {
    if (!this.state.mapRegion || !this.state.gyms || !this.state.user) {
      return <LoadingWheel />;
    }

    if (this.state.unread) {
      this.state.unread = false;
      Alert.alert(
        `Hello ${this.state.user.name}`,
        'You have a new session!',
        [
          {
            text: 'Close',
            onPress: () => markSessionsAsRead(
              this.state.pendingSessions,
              this.state.acceptSessions,
              this.state.user.type,
            ),
          },
          { text: 'View', onPress: () => Actions.CalendarPage() },
        ],
      );
    }

    let alertBoxFunction = null;
    let alertBox;
    if (this.state.currentSession) {
      alertBoxFunction = Actions.SessionPage({ session: this.state.currentSession });
    } else if (this.state.currentGroupSession) {
      alertBoxFunction = Actions.GroupSessionPage({ session: this.state.currentGroupSession });
    }

    if (alertBoxFunction !== null) {
      alertBox = (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => alertBoxFunction}
        >
          <Text style={styles.buttonText}>Enter Session!</Text>
        </TouchableOpacity>
      );
    }

    let gymModal;
    let menuOrBackButton;
    if (this.state.selectedGym) {
      menuOrBackButton = (
        <TouchableOpacity style={styles.menuButton} onPress={() => this.setState({ selectedGym: null})}>
          <Text>
            <FontAwesome name="arrow-left" color={Colors.Black} size={30} />
          </Text>
        </TouchableOpacity>
      );
      gymModal = (
        <View style={styles.gymModal}>
          <Text style={[styles.title]}>{this.state.selectedGym.name}</Text>
          <Text style={[styles.link, {fontSize: 18}]}>Details</Text>
        </View>
      );
    } else {
      gymModal = null;
      menuOrBackButton = (
        <TouchableOpacity style={styles.menuButton} onPress={this.toggleMenu}>
          <Text>
            <FontAwesome name="bars" color={Colors.Black} size={30} />
          </Text>
        </TouchableOpacity>
      );
    }

    const menu = this.state.user.trainerType !== Constants.managedType
      ? <SideMenu toggleMenu={this.toggleMenu} />
      : <ManagedSideMenu toggleMenu={this.toggleMenu} />;
    
    return (
      <Drawer
        open={this.state.menuOpen}
        content={menu}
        type="overlay"
        openDrawerOffset={0.3}
        tapToClose
        onClose={() => this.setState({ menuOpen: false })}
      >
        <View style={MasterStyles.flexStartContainer}>
          <MapView
            ref={(mapView) => { this.map = mapView; }}
            style={styles.map}
            onRegionChange={this.handleMapRegionChange}
            region={this.state.mapRegion}
            showsUserLocation
            onMapReady={() => {
              this.setState({ regionSet: true });
            }}
          >
            {this.state.gyms.map((marker) => (
              <MapView.Marker
                ref={(currentMarker) => { this.marker = currentMarker; }}
                key={marker.key}
                coordinate={marker.location}
                onPress={() => Actions.GymPage({ gymKey: marker.key })}
              >
                <Image source={markerImg} style={{ width: 50, height: 50 }} />
              </MapView.Marker>
            ))}
          </MapView>
          {alertBox}
          {menuOrBackButton}
          {gymModal}
          <View style={styles.gymsContainer}>
            <Text style={styles.title}>Find a gym near you</Text>
            <ScrollView contentContainerStyle={MasterStyles.flexStartContainer}>
              {this.renderGyms()}
            </ScrollView>
          </View>
        </View>
      </Drawer>
    );
  }
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
  },
  menuButton: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 50,
    height: 50,
    backgroundColor: Colors.White,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    top: 30,
    width: '40%',
    height: 48,
    backgroundColor: Colors.Secondary,
    flexDirection: 'column',
    justifyContent: 'center',
    margin: 10,
    borderRadius: 5,
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.LightGray,
    fontWeight: '700',
    fontSize: 16,
  },
  gymModal: {
    position: 'absolute',
    top: 100,
    backgroundColor: Colors.White,
    width: '90%',
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gymsContainer: {
    position: 'absolute',
    bottom: 0,
    height: '50%',
    width: '90%',
    borderRadius: 10,
    padding: 20,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 20,
    shadowColor: Colors.Black,
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  gymContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  nameContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '90%'
  },
  gymName: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Black,
  },
  distance: {
    fontWeight: '400',
    fontSize: 12,
    color: Colors.DarkGray,
  },
  link: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Purple,
  },
  linkContainer: {
    position: "absolute",
    right: 0,
  },
  gymImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    marginRight: 5,
  },
  title: {
    fontWeight: '600',
    fontSize: 20,
    textAlign: 'left',
  },
});
