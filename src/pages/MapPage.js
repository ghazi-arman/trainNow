import React, { Component } from 'react';
import {
  Image, StyleSheet, Text, View, Alert, TouchableOpacity, Dimensions, Linking, Platform,
} from 'react-native';
import * as Permissions from 'expo-permissions';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Drawer from 'react-native-drawer';
import bugsnag from '@bugsnag/expo';
import Menu from '../components/Menu';
import ManagedMenu from '../components/ManagedMenu';
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
} from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import GymModal from '../components/GymModal';
import markerImage from '../images/marker.png';
import profileImage from '../images/profile.png';

export default class MapPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedGym: null,
      viewDetails: false,
      currentSession: null,
      unread: false,
      menuOpen: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.userRegion) {
      const { status, permissions } = await Permissions.askAsync(Permissions.LOCATION);
      if (permissions && status === 'granted') {
        const location = await getLocation();
        this.setState({ userRegion: location });
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

  renderMarkers = () => this.state.gyms.map((gym) => (
    <MapView.Marker
      ref={(currentMarker) => { this.marker = currentMarker; }}
      key={gym.key}
      coordinate={gym.location}
      onPress={() => this.selectGym(gym)}
    >
      <Image source={markerImage} style={{ width: 50, height: 50 }} />
    </MapView.Marker>
  ))

  selectGym = (selectedGym) => {
    const gym = selectedGym;
    if (gym.trainers) {
      Object.keys(gym.trainers).map(async (key) => {
        try {
          gym.trainers[key].uri = await firebase.storage().ref().child(key).getDownloadURL();
        } catch (error) {
          gym.trainers[key].uri = Image.resolveAssetSource(profileImage).uri;
        } finally {
          this.setState({ selectedGym: gym });
        }
      });
    }
    this.setState({ selectedGym: gym });
    this.map.animateToRegion({
      latitude: selectedGym.location.latitude - 0.005,
      longitude: selectedGym.location.longitude,
      latitudeDelta: 0.0422,
      longitudeDelta: 0.0221,
    });
  };

  openMaps = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`https://maps.apple.com/?ll=${this.state.selectedGym.location.latitude},${this.state.selectedGym.location.longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${this.state.selectedGym.location.latitude},${this.state.selectedGym.location.longitude}`);
    }
  }

  render() {
    if (!this.state.gyms || !this.state.user || !this.state.userRegion) {
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

    let alertFunction = null;
    let alertBox;
    if (this.state.currentSession) {
      alertFunction = () => Actions.SessionPage({ session: this.state.currentSession });
    } else if (this.state.currentGroupSession) {
      alertFunction = () => Actions.GroupSessionPage({ session: this.state.currentGroupSession });
    }

    if (alertFunction) {
      alertBox = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPress={alertFunction}
        >
          <Text style={styles.buttonText}>Enter Session!</Text>
        </TouchableOpacity>
      );
    }

    let gymInfo;
    let menuOrBackButton;
    if (this.state.selectedGym) {
      menuOrBackButton = (
        <TouchableOpacity
          style={[styles.menuButton, MasterStyles.shadow]}
          onPress={() => this.setState({ selectedGym: null })}
        >
          <Text>
            <FontAwesome name="arrow-left" color={Colors.Black} size={25} />
          </Text>
        </TouchableOpacity>
      );
      if (!this.state.viewDetails) {
        gymInfo = (
          <View style={styles.gymInfo}>
            <Text style={[styles.title]}>{this.state.selectedGym.name}</Text>
            <Text
              style={[styles.link, { fontSize: 15 }]}
              onPress={() => { this.setState({ viewDetails: true }); }}
            >
              Details
            </Text>
          </View>
        );
      } else {
        gymInfo = (
          <View style={styles.expandedGymInfo}>
            <View style={styles.gymNameRow}>
              <Text style={[styles.title]}>{this.state.selectedGym.name}</Text>
              <Text
                style={[styles.link, { fontSize: 15 }]}
                onPress={() => { this.setState({ viewDetails: false }); }}
              >
                Close
              </Text>
            </View>
            {this.state.selectedGym.address ? (
              <Text
                style={[styles.link, { fontSize: 15, marginBottom: 5, color: Colors.Black }]}
                onPress={this.openMaps}
              >
                {this.state.selectedGym.address}
              </Text>
            ) : null}
            {this.state.selectedGym.website ? (
              <Text
                style={[styles.link, { fontSize: 15, marginBottom: 5 }]}
                onPress={() => Linking.openUrl(this.state.selectedGym.website)}
              >
                Website
              </Text>
            ) : null}
            <Text style={styles.gymDetails}>
              Hours:
              {' '}
              {this.state.selectedGym.hours}
            </Text>
          </View>
        );
      }
    } else {
      gymInfo = null;
      menuOrBackButton = (
        <TouchableOpacity
          style={[styles.menuButton, MasterStyles.shadow]}
          onPress={this.toggleMenu}
        >
          <Text>
            <FontAwesome name="bars" color={Colors.Black} size={25} />
          </Text>
        </TouchableOpacity>
      );
    }

    const menu = this.state.user.trainerType !== Constants.managedType
      ? <Menu toggleMenu={this.toggleMenu} />
      : <ManagedMenu toggleMenu={this.toggleMenu} />;

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
            initialRegion={this.state.userRegion}
            showsUserLocation
          >
            {this.renderMarkers()}
          </MapView>
          {alertBox}
          {menuOrBackButton}
          {gymInfo}
          <View style={[styles.gymsContainer, MasterStyles.shadow]}>
            <GymModal
              gyms={this.state.gyms}
              selectedGym={this.state.selectedGym}
              userRegion={this.state.userRegion}
              selectGym={this.selectGym}
              user={this.state.user}
            />
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
    top: Dimensions.get('window').height / 20,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: Colors.White,
    borderWidth: 1,
    borderColor: Colors.Black,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    position: 'absolute',
    top: Dimensions.get('window').height / 20,
    width: '40%',
    height: 40,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.Black,
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.Primary,
    fontWeight: '700',
    fontSize: 16,
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
  },
  expandedGymInfo: {
    position: 'absolute',
    top: 100,
    backgroundColor: Colors.White,
    width: '90%',
    borderRadius: 10,
    height: 150,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  gymNameRow: {
    height: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gymInfo: {
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
  link: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Primary,
  },
  title: {
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'left',
  },
  gymDetails: {
    fontSize: 15,
    marginBottom: 5,
    color: Colors.DarkGray,
  },
});
