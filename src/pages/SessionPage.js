import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking,
} from 'react-native';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import Constants from '../components/Constants';
import Colors from '../components/Colors';
import {
  getLocation, loadSession, dateToString, chargeCard, loadUser, sendMessage,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class SessionPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    this.interval = setInterval(async () => {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
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

  endSession = async () => {
    try {
      if (this.state.submitted) {
        return;
      }
      this.setState({ submitted: true });
      const user = firebase.auth().currentUser;
      const sessionRef = firebase.database().ref(`/trainSessions/${this.state.session.key}`);
      const session = await loadSession(this.state.session.key);
      if (session.clientKey === user.uid) {
        const total = (parseInt(session.duration, 10) * (session.rate / 60) * 100).toFixed(0);
        let percentage = session.regular
          ? Constants.regularClientPercentage
          : Constants.newClientPercentage;
        if (session.type === Constants.groupSessionType) {
          percentage = Constants.groupSessionPercentage;
        }
        const payout = (total - total * percentage).toFixed(0);
        await chargeCard(
          this.state.user.stripeId,
          session.trainerStripe,
          session.trainerKey,
          total,
          total - payout,
        );
        const message = `You were charged $ ${(total / 100).toFixed(2)} for your session with ${this.state.session.trainerName}. If this is not accurate please contact support.`;
        await sendMessage(this.state.user.phone, message);
      }

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
      Linking.openURL(`sms:${this.state.session.clientPhone}`);
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
    let ended;
    let ownEnded;
    let description;
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

    const dateToShowFirstButton = new Date(
      new Date(this.state.session.start).getTime() - 15 * 60000,
    );
    if (dateToShowFirstButton >= new Date()) {
      if (!this.state.session.virtual) {
        secondButton = (
          <TouchableOpacity style={CommonStyles.halfButton} onPress={this.openMaps}>
            <Text style={CommonStyles.buttonText}>Open in Maps</Text>
          </TouchableOpacity>
        );
      }
    } else {
      button = (
        <TouchableOpacity style={CommonStyles.halfButton} onPress={this.endSession}>
          <Text style={CommonStyles.buttonText}>End Session</Text>
        </TouchableOpacity>
      );

      secondButton = (
        <TouchableOpacity style={CommonStyles.halfButton} onPress={this.sendMessage}>
          <Text style={CommonStyles.buttonText}>Send Message</Text>
        </TouchableOpacity>
      );

      // Gives info about whether trainer/client has ended the session
      if (this.state.session.clientEnd && user.uid === this.state.session.trainerKey) {
        ended = (
          <Text style={styles.smallText}>
            {this.state.session.clientName}
            {' '}
            has ended!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.clientKey) {
        ended = (
          <Text style={styles.smallText}>
            {this.state.session.trainerName}
            {' '}
            has ended!
          </Text>
        );
      }

      if (this.state.session.clientEnd && user.uid === this.state.session.clientKey) {
        ownEnded = (
          <Text style={styles.smallText}>
            Waiting for
            {' '}
            {this.state.session.trainerName}
            {' '}
            to end!
          </Text>
        );
      } else if (this.state.session.trainerEnd && user.uid === this.state.session.trainerKey) {
        ownEnded = (
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
          {ended}
          {ownEnded}
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
          />
        </MapView>
        <View style={styles.buttonRow}>
          {button}
          {secondButton}
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
