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
  getLocation, loadGroupSession, dateToString, startGroupSession,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

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

    let displayDate = dateToString(this.state.session.start);

    let button;
    let time;
    let minutes;
    let remaining;
    let ready;
    let textButton;
    let description;
    let length;
    const user = firebase.auth().currentUser;

    if (this.state.session.trainerKey === user.uid) {
      description = (
        <Text style={styles.bookDetails}>
          You are hosting
          {' '}
          {this.state.session.name}
        </Text>
      );
    } else {
      textButton = (
        <TouchableOpacity
          style={[styles.button, MasterStyles.shadow]}
          onPress={this.sendMessage}
        >
          <Text style={styles.buttonText}>Send Message</Text>
        </TouchableOpacity>
      );
      description = (
        <Text style={styles.bookDetails}>
          {this.state.session.trainerName}
          {' '}
          is training you!
        </Text>
      );
    }

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
      const pendingDate = new Date(this.state.session.start);
      displayDate = dateToString(this.state.session.start);
      const bookDurationMs = this.state.session.duration * 60000;
      remaining = ((pendingDate.getTime() + bookDurationMs) - new Date().getTime());
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
      <View style={MasterStyles.spacedContainer}>
        <View style={styles.nameContainer}>
          <BackButton style={styles.backButton} />
        </View>
        <View style={styles.formContainer}>
          {description}
          {time}
          {length}
          {ready}
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
          {button}
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={this.openMaps}
          >
            <Text style={styles.buttonText}> Open in Maps </Text>
          </TouchableOpacity>
          {textButton}
        </View>
      </View>
    );
  }
}

GroupSessionPage.propTypes = {
  session: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  bookDetails: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.Primary,
    textAlign: 'center',
    margin: 5,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
  },
  smallText: {
    margin: 5,
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
  nameContainer: {
    height: '12%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    height: '88%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  mapContainer: {
    width: '100%',
    height: '30%',
  },
  button: {
    borderRadius: 10,
    width: '80%',
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
    fontWeight: '700',
  },
});
