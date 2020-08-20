import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking, Image,
} from 'react-native';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import Constants from '../components/Constants';
import Colors from '../components/Colors';
import {
  getLocation, loadGroupSession, dateToString, startGroupSession, chargeCard, loadUser,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';
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
        const user = await loadUser(firebase.auth().currentUser.uid);
        // if session has been ended redirect to rating page
        if (session.end) {
          clearInterval(this.interval);
          Actions.GroupSessionRatingPage({ session: session.key });
        }
        this.setState({
          session, userRegion: location, mapRegion: location, user,
        });
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
    try {
      if (this.state.submitted) {
        return;
      }
      this.setState({ submitted: true });
      if (this.state.session.trainerKey !== firebase.auth().currentUser.uid) {
        const total = (this.state.session.cost * 100).toFixed(0);
        const payout = (total - (total * Constants.groupSessionPercentage)).toFixed(0);
        await chargeCard(
          this.state.user.stripeId,
          this.state.session.trainerStripe,
          total,
          total - payout,
          this.state.session,
          this.state.user.phone,
        );
      }
      const sessionRef = firebase.database().ref(`/groupSessions/${this.state.session.key}`);
      const gymSessionRef = firebase.database().ref(`/gyms/${this.state.session.gymKey}/groupSessions/${this.state.session.key}`);
      sessionRef.update({ end: new Date() });
      gymSessionRef.update({ end: new Date() });
      clearInterval(this.interval);
      Actions.GroupSessionRatingPage({ session: this.state.session.key });
    } catch (error) {
      this.bugsnagClient.notify(error);
    } finally {
      this.setState({ submitted: false });
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
      const clientPhones = Object.keys(this.state.session.clients).map((clientKey) => this.state.session.clients[clientKey].phone).join(',');
      const messagingLink = Platform.OS === 'ios'
        ? `sms:/open?addresses=${clientPhones}`
        : `sms:${clientPhones}`;
      Linking.openURL(messagingLink);
    } else {
      Linking.openURL(`sms:${this.state.session.trainerPhone}`);
    }
  }

  render() {
    if (!this.state.session || !this.state.userRegion || this.state.submitted) {
      return <LoadingWheel />;
    }

    let button;
    let secondButton;
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

      if (!this.state.session.virtual) {
        secondButton = (
          <TouchableOpacity style={CommonStyles.halfButton} onPress={this.openMaps}>
            <Text style={CommonStyles.buttonText}>Open in Maps</Text>
          </TouchableOpacity>
        );
      }

      if (this.state.session.trainerKey === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity
            style={CommonStyles.halfButton}
            onPress={this.startSession}
          >
            <Text style={CommonStyles.buttonText}> Start Session </Text>
          </TouchableOpacity>
        );
      }
    } else {
      if (this.state.session.trainerKey === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity
            style={CommonStyles.halfButton}
            onPress={this.endSession}
          >
            <Text style={CommonStyles.buttonText}>
              End Session
            </Text>
          </TouchableOpacity>
        );
      }
      secondButton = (
        <TouchableOpacity style={CommonStyles.halfButton} onPress={this.sendMessage}>
          <Text style={CommonStyles.buttonText}>Send Message</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={[CommonStyles.flexStartContainer, { alignItems: 'flex-start' }]}>
        <BackButton />
        <Text style={styles.title}>Your Session</Text>
        <View style={styles.infoContainer}>
          {description}
          <Text style={styles.mediumText}>
            {dateToString(this.state.session.start)}
            {' '}
            (
            {this.state.session.duration}
            {' '}
            min)
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
            coordinate={this.state.session.virtual
              ? this.state.session.location
              : this.state.userRegion}
          >
            <Image source={markerImage} style={{ width: 40, height: 40 }} />
          </MapView.Marker>
        </MapView>
        <View style={styles.buttonRow}>
          {button}
          {secondButton}
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
  title: {
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
});
