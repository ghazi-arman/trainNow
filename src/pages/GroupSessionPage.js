import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking, Image
} from 'react-native';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  getLocation, loadGroupSession, dateToString, startGroupSession,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import markerImage from '../images/marker.png';

export default class GroupSessionPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    this.interval = setInterval(async () => {
      try {
        const location = await getLocation();
        const session = await loadGroupSession(this.props.session);
        // if session has been ended redirect to rating page
        if (session.end) {
          clearInterval(this.interval);
          Actions.GroupSessionRatingPage({ session: session.key });
        }
        this.setState({ session, userRegion: location, mapRegion: location });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error when trying to load the current session.');
        Actions.MapPage();
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  startSession = () => {
    startGroupSession(this.state.session.key, this.state.userRegion);
  }

  endSession = async () => {
    const sessionRef = firebase.database().ref(`/groupSessions/${this.state.session.key}`);
    const gymSessionRef = firebase.database().ref(`/gyms/${this.state.session.gymKey}/groupSessions/${this.state.session.key}`);
    sessionRef.update({ end: new Date() });
    gymSessionRef.update({ end: new Date() });
    clearInterval(this.interval);
    Actions.GroupSessionRatingPage({ session: this.state.session.key });
  }

  openMaps = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`https://maps.apple.com/?ll=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    }
  }

  sendMessage = () => {
    Linking.openURL(`sms:${this.state.session.trainerPhone}`);
  }

  render() {
    if (!this.state.session || !this.state.userRegion) {
      return <LoadingWheel />;
    }

    let button;
    let ready;
    let description;
    const user = firebase.auth().currentUser;

    if (this.state.session.trainerKey === user.uid) {
      description = (
        <Text style={styles.mediumText}>
          You are hosting
          {' '}
          {this.state.session.name}
        </Text>
      );
    } else {
      description = (
        <Text style={styles.mediumText}>
          {this.state.session.trainerName}
          {' '}
          is training you!
        </Text>
      );
    }

    if (!this.state.session.started) {
      if (!this.state.session.started) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            has not started the session!
          </Text>
        );
      } else {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            has started the session!
          </Text>
        );
      }

      if (this.state.session.trainerKey === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={this.startSession}
          >
            <Text style={styles.buttonText}> Start Session </Text>
          </TouchableOpacity>
        );
      }
    } else {
      if (this.state.session.trainerKey === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPressIn={this.endSession}
          >
            <Text style={styles.buttonText}>
              End Session
            </Text>
          </TouchableOpacity>
        );
      }
    }
    return (
      <View style={[MasterStyles.flexStartContainer, {alignItems: 'flex-start'}]}>
        <BackButton />
        <Text style={styles.header}>Your Session</Text>
        <View style={styles.infoContainer}>
          {description}
          <Text style={styles.mediumText}>
            {dateToString(this.state.session.start)} ({this.state.session.duration} min)
          </Text>
          {ready}
        </View>
        <MapView
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}
          style={styles.mapContainer}
          region={this.state.mapRegion}
          showsUserLocation
        >
          <MapView.Marker
            ref={this.state.session.trainerKey}
            key={this.state.session.trainerKey}
            coordinate={this.state.session.location}
          >
            <Image source={markerImage} style={{ width: 40, height: 40 }} />
          </MapView.Marker>
        </MapView>
        <View style={styles.buttonRow}>
          {button}
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={this.openMaps}
          >
            <Text style={styles.buttonText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

GroupSessionPage.propTypes = {
  session: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  infoContainer: {
    width: '100%',
    backgroundColor: Colors.LightGray,
    padding: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
  },
  mediumText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    margin: 10,
  },
  smallText: {
    margin: 10,
    fontSize: 15,
    color: Colors.Primary,
    textAlign: 'center',
  },
  header: {
    fontSize: 25,
    fontWeight: '700',
    margin: 15,
  },
  mapContainer: {
    width: '100%',
    height: '30%',
  },
  buttonRow: {
    width: '100%',
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    borderRadius: 10,
    width: '40%',
    height: 40,
    marginTop: 15,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
    color: Colors.Primary,
    fontWeight: '500',
  },
});
