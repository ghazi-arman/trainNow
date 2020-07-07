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

    if (session.trainer === user.uid) {
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
    if (this.state.session.trainer === firebase.auth().currentUser.uid) {
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

    if (this.state.session.client === user.uid) {
      description = (
        <Text style={styles.bookDetails}>
          {this.state.session.trainerName}
          {' '}
          is training you!
        </Text>
      );
    } else {
      description = (
        <Text style={styles.bookDetails}>
          You are training
          {' '}
          {this.state.session.clientName}
          !
        </Text>
      );
    }
    const mapButton = (
      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={this.openMaps}
      >
        <Text style={styles.buttonText}> Open in Maps </Text>
      </TouchableOpacity>
    );
    const textButton = (
      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={this.sendMessage}
      >
        <Text style={styles.buttonText}> Send Message </Text>
      </TouchableOpacity>
    );

    const map = (
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
          ref={this.state.session.trainer}
          key={this.state.session.trainer}
          coordinate={this.state.session.location}
        />
      </MapView>
    );

    if (!this.state.session.started) {
      time = (
        <Text style={styles.bookDetails}>
          {displayDate}
          {' '}
        </Text>
      );
      length = (
        <Text style={styles.bookDetails}>
          {this.state.session.duration}
          {' '}
          min
        </Text>
      );
      button = (
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={this.startSession}
        >
          <Text style={styles.buttonText}> Start Session </Text>
        </TouchableOpacity>
      );

      // Gives info about whether trainer/client is ready or en route
      if (this.state.session.clientReady && user.uid === this.state.session.trainer) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            is ready!
          </Text>
        );
      } else if (this.state.session.trainerReady && user.uid === this.state.session.client) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            is ready!
          </Text>
        );
      } else if (user.uid === this.state.session.client) {
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
      if (this.state.session.clientReady && user.uid === this.state.session.client) {
        ownReady = <Text style={styles.smallText}>You are ready!</Text>;
      } else if (this.state.session.trainerReady && user.uid === this.state.session.trainer) {
        ownReady = <Text style={styles.smallText}>You are ready!</Text>;
      }
    } else {
      const pendingDate = new Date(this.state.session.start);
      displayDate = dateToString(this.state.session.start);
      const durationMs = this.state.session.duration * 60000;
      remaining = ((pendingDate.getTime() + durationMs) - new Date().getTime());
      minutes = Math.max(Math.floor((remaining / 1000) / 60), 0);
      time = <Text style={styles.bookDetails}>{displayDate}</Text>;
      length = (
        <Text style={styles.bookDetails}>
          You have
          {' '}
          {minutes}
          {' '}
          min left
        </Text>
      );
      button = (
        <TouchableOpacity
          style={styles.buttonContainer}
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
      if (this.state.session.clientEnd && user.uid === this.state.session.trainer) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            has ended!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.client) {
        ready = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            has ended!
          </Text>
        );
      }

      if (this.state.session.clientEnd && user.uid === this.state.session.client) {
        ownEnd = (
          <Text style={styles.smallText}>
            Waiting for
            {this.state.session.trainerName}
            {' '}
            to end!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.trainer) {
        ownEnd = (
          <Text style={styles.smallText}>
            Waiting for
            {this.state.session.clientName}
            {' '}
            to end!
          </Text>
        );
      }
    }
    return (
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.header}>Your Session</Text>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.infoContainer}>
            {description}
            {time}
            {length}
            {ready}
          </View>
          {map}
          <View style={styles.buttonContain}>
            {button}
            {mapButton}
            {textButton}
            {ownReady}
            {ownEnd}
          </View>
        </View>
      </View>
    );
  }
}

SessionPage.propTypes = {
  session: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  bookDetails: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.Primary,
  },
  smallText: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: '300',
    color: Colors.Secondary,
    textAlign: 'center',
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.Primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  formContainer: {
    flex: 8,
    width: '95%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    width: '95%',
    flex: 10,
  },
  buttonContain: {
    width: '50%',
    flex: 8,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  infoContainer: {
    height: '35%',
    width: '80%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: '100%',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.White,
    fontWeight: '700',
  },
});
