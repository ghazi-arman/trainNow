import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
  Alert,
  Linking,
} from 'react-native';
import firebase from 'firebase';
import MapView from 'react-native-maps';
import PropTypes from 'prop-types';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  loadGym, renderStars, dateToString, joinGroupSession, loadUser,
} from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

const markerImg = require('../images/marker.png');
const profileImg = require('../images/profile.png');

export default class GymPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 'trainers',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.gym) {
      try {
        const gym = await loadGym(this.props.gymKey);
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.loadImages(gym);
        this.setState({ gym, user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading this gym. Please try again later.');
        Actions.MapPage();
      }
    }
  }

  // Loads trainer images from firesbase
  loadImages = (gym) => {
    if (!gym.trainers) {
      return;
    }
    Object.keys(gym.trainers).map(async (key) => {
      try {
        const url = await firebase.storage().ref().child(key).getDownloadURL();
        // eslint-disable-next-line
        gym.trainers[key].uri = url;
        this.setState({ gym });
      } catch (error) {
        // eslint-disable-next-line
        gym.trainers[key].uri = null;
        this.setState({ gym });
      }
    });
  }

  // Deselects or selects trainer based on trainer clicked
  setTrainer = (trainer) => {
    if (this.state.trainer === trainer) {
      return null;
    }
    return trainer;
  }

  // Deselects or selects group session based on session clicked
  setSession = (session) => {
    if (this.state.session === session) {
      return null;
    }
    return session;
  }

  joinGroupSession = async (session) => {
    try {
      const userId = firebase.auth().currentUser.uid;
      if (session.clientCount >= session.capacity) {
        Alert.alert('This session is already full.');
        return;
      }

      if (session.clients && session.clients[userId]) {
        Alert.alert('You have already joined this session.');
        return;
      }

      if (!this.state.user.cardAdded) {
        Alert.alert('You must have a card entered before you can join a group session.');
        return;
      }

      if (userId === session.trainerKey) {
        Alert.alert('You cannot join you own group session.');
        return;
      }

      if (session.started) {
        Alert.alert('You cannot join a session after it has started.');
        return;
      }

      await joinGroupSession(session, this.state.user, userId);
      const gym = await loadGym(this.props.gymKey);
      this.loadImages(gym);
      this.setState({ gym });
      Alert.alert('You have successfully joined the session. You can leave this session before it starts on the calendar page.');
    } catch (error) {
      Alert.alert('There was an error when trying to join the group session. Please try again later');
    }
  }

  // Returns list of group sessions in a view
  renderSessions = () => {
    if (!this.state.gym.groupSessions) {
      return null;
    }

    const sessions = [];
    Object.keys(this.state.gym.groupSessions).forEach((key) => {
      const session = this.state.gym.groupSessions[key];
      session.key = key;
      sessions.push(session);
    });

    const sessionsList = sessions.map((session) => {
      const trainerImage = this.state.gym.trainers[session.trainerKey].uri;
      let imageHolder;
      if (!trainerImage) {
        imageHolder = (
          <View style={styles.imageContainer}>
            <Image source={profileImg} style={styles.imageHolder} />
          </View>
        );
      } else {
        imageHolder = (
          <View style={styles.imageContainer}>
            <Image source={{ uri: trainerImage }} style={styles.imageHolder} />
          </View>
        );
      }

      let infoArea;
      if (this.state.session === session.key) {
        infoArea = (
          <View style={styles.infoArea}>
            <Text style={[styles.info, { fontWeight: '700' }]}>
              {session.trainerName}
              {' '}
              - $
              {session.cost}
            </Text>
            <Text style={styles.info}>{session.bio}</Text>
            <View style={styles.fullButtonRow}>
              <TouchableOpacity
                style={styles.fullButtonContainer}
                onPress={() => this.joinGroupSession(session)}
              >
                <Text style={styles.buttonText}>Join Session!</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      } else {
        infoArea = null;
      }

      return (
        <TouchableWithoutFeedback
          key={session.key}
          onPress={() => { this.setState({ session: this.setSession(session.key) }); }}
        >
          <View style={styles.trainerContainer}>
            <View style={styles.trainerRow}>
              {imageHolder}
              <View style={styles.trainerInfoContainer}>
                <Text style={styles.trainerName}>{session.name}</Text>
                <Text style={styles.info}>
                  {session.clientCount}
                  {' '}
                  /
                  {' '}
                  {session.capacity}
                  {' '}
                  clients
                </Text>
                <Text style={styles.info}>{dateToString(session.start)}</Text>
                <Text style={styles.info}>
                  {session.duration}
                  {' '}
                  min
                </Text>
              </View>
            </View>
            {infoArea}
          </View>
        </TouchableWithoutFeedback>
      );
    });
    return sessionsList;
  }

  // Returns list of trainers with corresponding view
  renderTrainers = () => {
    if (!this.state.gym.trainers) {
      return null;
    }

    const trainers = [];
    Object.keys(this.state.gym.trainers).forEach((key) => {
      const trainer = this.state.gym.trainers[key];
      trainer.userKey = key;
      trainers.push(trainer);
    });

    trainers.sort((a, b) => {
      if (a.active && b.active) {
        return b.rating - a.rating;
      } if (b.active) {
        return 1;
      }
      return -1;
    });

    const trainersList = trainers.map((trainer) => {
      let activeField;
      if (trainer.active) {
        activeField = (
          <Text style={[styles.rate, styles.active]}>
            Active - $
            {trainer.rate}
            /hr
          </Text>
        );
      } else {
        activeField = (
          <Text style={[styles.rate, styles.away]}>
            Away - $
            {trainer.rate}
            /hr
          </Text>
        );
      }

      let imageHolder;
      if (!trainer.uri) {
        imageHolder = (
          <View style={styles.imageContainer}>
            <Image source={profileImg} style={styles.imageHolder} />
          </View>
        );
      } else {
        imageHolder = (
          <View style={styles.imageContainer}>
            <Image source={{ uri: trainer.uri }} style={styles.imageHolder} />
          </View>
        );
      }

      let infoArea;
      if (this.state.trainer === trainer.userKey) {
        infoArea = (
          <View style={styles.infoArea}>
            <Text style={styles.info}>{trainer.bio}</Text>
            <Text style={styles.info}>
              Certs:
              {' '}
              {trainer.cert}
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => {
                  Actions.BookingPage({
                    clientKey: this.state.user.userKey,
                    trainerKey: trainer.userKey,
                    gymKey: this.props.gymKey,
                    bookedBy: Constants.clientType,
                  });
                }}
              >
                <Text style={styles.buttonText}>Book Now!</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => { Actions.SchedulePage({ trainerKey: trainer.userKey }); }}
              >
                <Text style={styles.buttonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      } else {
        infoArea = null;
      }

      // DOM Element for a trainer in gym modal
      return (
        <TouchableWithoutFeedback
          key={trainer.userKey}
          onPress={() => { this.setState({ trainer: this.setTrainer(trainer.userKey) }); }}
        >
          <View style={styles.trainerContainer}>
            <View style={styles.trainerRow}>
              {imageHolder}
              <View style={styles.trainerInfoContainer}>
                <Text style={styles.trainerName}>{trainer.name}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.icon}>{renderStars(trainer.rating)}</Text>
                  {activeField}
                </View>
              </View>
            </View>
            {infoArea}
          </View>
        </TouchableWithoutFeedback>
      );
    });
    return trainersList;
  }

  // Loads map object
  loadMap = () => (
    <MapView
      style={styles.map}
      region={{
        latitude: this.state.gym.location.latitude,
        longitude: this.state.gym.location.longitude,
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221,
      }}
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <MapView.Marker
        key={this.state.gym.key}
        coordinate={this.state.gym.location}
      >
        <Image source={markerImg} style={{ width: 50, height: 50 }} />
      </MapView.Marker>
    </MapView>
  )

  render() {
    if (!this.state.gym) {
      return <LoadingWheel />;
    }
    let websiteLink;
    if (this.state.gym.website) {
      websiteLink = (
        <Text
          onPress={() => Linking.openURL(this.state.gym.website)}
          style={styles.smallText}
        >
          Website
        </Text>
      );
    }
    return (
      <View style={MasterStyles.centeredContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.gymName}>{this.state.gym.name}</Text>
          {websiteLink}
          <Text style={styles.smallText}>{this.state.gym.hours}</Text>
        </View>
        <View style={styles.mapContainer}>
          {this.loadMap()}
        </View>
        <View style={styles.trainersContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.subTitle}>Trainers</Text>
            {this.renderTrainers()}
            <Text style={styles.subTitle}>Sessions</Text>
            {this.renderSessions()}
          </ScrollView>
        </View>
      </View>
    );
  }
}

GymPage.propTypes = {
  gymKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  gymName: {
    fontSize: 30,
    color: Colors.White,
    fontWeight: '500',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 30,
    color: Colors.Primary,
    fontWeight: '500',
    textAlign: 'center',
    margin: 10,
  },
  nameContainer: {
    flex: 2,
    width: '100%',
    backgroundColor: Colors.Primary,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 2,
    width: '100%',
  },
  map: {
    flex: 2,
    width: '100%',
  },
  trainersContainer: {
    flex: 6,
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingLeft: 22,
    paddingBottom: 10,
  },
  trainerContainer: {
    backgroundColor: Colors.White,
    width: '95%',
    minHeight: 100,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.Primary,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  trainerRow: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingRow: {
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  infoArea: {
    width: '95%',
  },
  info: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.Primary,
    margin: 5,
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fullButtonRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHolder: {
    width: 90,
    height: 90,
    borderRadius: 5,
  },
  trainerInfoContainer: {
    width: '60%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: 100,
  },
  ratingContainer: {
    height: 50,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainerName: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: Colors.Primary,
  },
  rate: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.White,
  },
  smallText: {
    fontSize: 20,
    color: Colors.White,
    fontWeight: '400',
    marginTop: 5,
  },
  toggledButton: {
    backgroundColor: Colors.Secondary,
  },
  menuTab: {
    width: '50%',
    padding: 5,
    backgroundColor: Colors.Primary,
    borderWidth: 1,
    borderColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '40%',
    height: 48,
    backgroundColor: Colors.Secondary,
    flexDirection: 'column',
    justifyContent: 'center',
    margin: 10,
    borderRadius: 5,
  },
  fullButtonContainer: {
    width: '80%',
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
  },
  active: {
    color: Colors.Secondary,
  },
  away: {
    color: Colors.Primary,
  },
  icon: {
    color: Colors.Secondary,
    fontSize: 15,
  },
});
