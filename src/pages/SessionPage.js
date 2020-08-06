import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking,
} from 'react-native';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  getLocation, loadSession, dateToString, startSession,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class SessionPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    this.interval = setInterval(async () => {
      try {
        const location = await getLocation();
        const session = await loadSession(this.props.session);
        const sessionRef = firebase.database().ref(`/trainSessions/${this.props.session}`);
        // if session has been ended redirect to rating page
        if (session.end) {
          clearInterval(this.interval);
          Actions.RatingPage({ session: session.key });
        }
        // if both users have ended the session then set end time if not already set
        if (session.clientEnd && session.trainerEnd && !session.end) {
          clearInterval(this.interval);
          sessionRef.update({ end: new Date() });
          Actions.RatingPage({ session: session.key });
        }
        // if both users are ready then start session if it has not been started yet
        if (session.clientReady && session.trainerReady && !session.started) {
          sessionRef.update({ start: new Date(), started: true });
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
    startSession(this.state.session.key, this.state.userRegion);
  }

  endSession = async () => {
    const user = firebase.auth().currentUser;
    const sessionRef = firebase.database().ref(`/trainSessions/${this.state.session.key}`);
    const session = await loadSession(this.state.session.key);

    if (session.trainerKey === user.uid) {
      if (session.clientEnd) {
        sessionRef.update({ trainerEnd: true, end: new Date() });
        clearInterval(this.interval);
        Actions.RatingPage({ session: this.state.session.key });
      } else {
        sessionRef.update({ trainerEnd: true, read: true });
      }
    } else if (session.trainerEnd) {
      sessionRef.update({ clientEnd: true, end: new Date() });
      clearInterval(this.interval);
      Actions.RatingPage({ session: this.state.session.key });
    } else {
      sessionRef.update({ clientEnd: true, read: true });
    }
  }

  openMaps = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`https://maps.apple.com/?ll=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    }
  }

  sendMessage = () => {
    if (this.state.session.trainerKey === firebase.auth().currentUser.uid) {
      Linking.openURL(`sms:${this.state.session.clientPhone}`);
    } else {
      Linking.openURL(`sms:${this.state.session.trainerPhone}`);
    }
  }

  render() {
    if (!this.state.session || !this.state.userRegion) {
      return <LoadingWheel />;
    }

    let displayDate = dateToString(this.state.session.start);
    let button;
    let time;
    let minutes;
    let remaining;
    let ready;
    let ownReady;
    let ownEnd;
    let description;
    let length;
    const user = firebase.auth().currentUser;

    if (this.state.session.clientKey === user.uid) {
      description = (
        <Text style={styles.mediumText}>
          {this.state.session.trainerName}
          {' '}
          is training you!
        </Text>
      );
    } else {
      description = (
        <Text style={styles.mediumText}>
          You are training
          {' '}
          {this.state.session.clientName}
          !
        </Text>
      );
    }

    if (!this.state.session.started) {
      time = (
        <Text style={styles.mediumText}>
          {displayDate}
          {' '}
        </Text>
      );
      length = (
        <Text style={styles.mediumText}>
          {this.state.session.duration}
          {' '}
          min
        </Text>
      );
      button = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPress={this.startSession}
        >
          <Text style={styles.buttonText}> Start Session </Text>
        </TouchableOpacity>
      );

      // Gives info about whether trainer/client is ready or en route
      if (this.state.session.clientReady && user.uid === this.state.session.trainerKey) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            is ready!
          </Text>
        );
      } else if (this.state.session.trainerReady && user.uid === this.state.session.clientKey) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            is ready!
          </Text>
        );
      } else if (user.uid === this.state.session.clientKey) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            is en route!
          </Text>
        );
      } else {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            is en route
          </Text>
        );
      }

      // Gives info about if user is ready or not
      if (this.state.session.clientReady && user.uid === this.state.session.clientKey) {
        ownReady = <Text style={styles.smallText}>You are ready!</Text>;
      } else if (this.state.session.trainerReady && user.uid === this.state.session.trainerKey) {
        ownReady = <Text style={styles.smallText}>You are ready!</Text>;
      }
    } else {
      const pendingDate = new Date(this.state.session.start);
      displayDate = dateToString(this.state.session.start);
      const durationMs = this.state.session.duration * 60000;
      remaining = ((pendingDate.getTime() + durationMs) - new Date().getTime());
      minutes = Math.max(Math.floor((remaining / 1000) / 60), 0);
      time = <Text style={styles.mediumText}>{displayDate}</Text>;
      length = (
        <Text style={styles.mediumText}>
          You have
          {' '}
          {minutes}
          {' '}
          min left
        </Text>
      );
      button = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPressIn={this.endSession}
        >
          <Text
            style={styles.buttonText}
          >
            End Session
          </Text>
        </TouchableOpacity>
      );

      // Gives info about whether trainer/client is ready or en route
      if (this.state.session.clientEnd && user.uid === this.state.session.trainerKey) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            has ended!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.clientKey) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            has ended!
          </Text>
        );
      }

      if (this.state.session.clientEnd && user.uid === this.state.session.clientKey) {
        ownEnd = (
          <Text style={styles.smallText}>
            Waiting for
            {' '}
            {this.state.session.trainerName}
            {' '}
            to end!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.trainerKey) {
        ownEnd = (
          <Text style={styles.smallText}>
            Waiting for
            {' '}
            {this.state.session.clientName}
            {' '}
            to end!
          </Text>
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
          {ownReady}
          {ownEnd}
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
            />
          </MapView>
          <View style={styles.buttonRow}>
            {button}
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPress={this.openMaps}
            >
              <Text style={styles.buttonText}> Open in Maps </Text>
            </TouchableOpacity>
          </View>
        </View>
    );
  }
}

SessionPage.propTypes = {
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
    margin: 5,
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
    fontWeight: '600',
  },
});
