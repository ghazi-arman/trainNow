import React, { Component } from 'react';
import {
  Image, StyleSheet, Text, View, Alert, TouchableOpacity,
} from 'react-native';
import * as Permissions from 'expo-permissions';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Drawer from 'react-native-drawer';
import bugsnag from '@bugsnag/expo';
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
  loadUpcomingSessions,
  loadCurrentGroupSession,
} from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

const markerImg = require('../images/marker.png');

export default class MapPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedGym: {},
      scheduleTrainer: {},
      selectedTrainer: {},
      currentSession: null,
      unread: false,
      menuOpen: false,
      alertPresent: false,
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
        await goToPendingRating(user.type, userId);
        const gyms = await loadGyms();
        const currentSession = await loadCurrentSession(user.type, userId);
        const currentGroupSession = await loadCurrentGroupSession(user.type, userId);
        const unread = await checkForUnreadSessions(user.type, userId);
        const pendingSessions = await loadPendingSessions(userId, user.type);
        const acceptSessions = await loadUpcomingSessions(userId, user.type);
        this.setState({
          gyms, user, currentSession, unread, pendingSessions, acceptSessions, currentGroupSession,
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

  render() {
    if (!this.state.mapRegion || !this.state.gyms || !this.state.user) {
      return <LoadingWheel />;
    }

    if (this.state.unread && !this.state.alertPresent) {
      this.state.alertPresent = true;
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

    let alertBox;
    let menu;
    if (this.state.currentSession) {
      alertBox = (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => Actions.SessionPage({ session: this.state.currentSession })}
        >
          <Text style={styles.buttonText}>Enter Session!</Text>
        </TouchableOpacity>
      );
    } else if (this.state.currentGroupSession) {
      alertBox = (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={() => Actions.GroupSessionPage({ session: this.state.currentGroupSession })}
        >
          <Text style={styles.buttonText}>Enter Session!</Text>
        </TouchableOpacity>
      );
    }

    if (this.state.user.trainerType !== Constants.managedType) {
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
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuIcon} onPress={this.toggleMenu}>
              <FontAwesome name="bars" size={50} />
            </Text>
          </TouchableOpacity>
          {alertBox}
        </View>
      </Drawer>
    );
  }
}

const styles = StyleSheet.create({
  map: {
    height: '100%',
    width: '100%',
  },
  menuButton: {
    position: 'absolute',
    top: 30,
    left: 20,
    width: 60,
    height: 60,
  },
  menuIcon: {
    color: Colors.Primary,
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
    color: Colors.White,
    fontWeight: '700',
    fontSize: 16,
  },
});
