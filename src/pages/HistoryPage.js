import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import { loadSessions, dateToString, getLocation } from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import profileImage from '../images/profile.png';

export default class HistoryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    try {
      const sessions = await loadSessions(firebase.auth().currentUser.uid);
      const userRegion = await getLocation();
      this.loadImages(sessions);
      this.setState({ sessions, userRegion });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error loading the history page. Please try again later.');
      Actions.MapPage();
    }
  }

  loadImages = (sessions) => {
    const updatedSessions = sessions;
    Object.keys(updatedSessions).map(async (key) => {
      let trainerImage;
      try {
        trainerImage = await firebase.storage().ref()
          .child(updatedSessions[key].trainerKey).getDownloadURL();
      } catch {
        trainerImage = Image.resolveAssetSource(profileImage).uri;
      } finally {
        updatedSessions[key].trainerImage = trainerImage;
        this.setState({ sessions: updatedSessions });
      }
      let clientImage;
      try {
        clientImage = await firebase.storage().ref()
          .child(sessions[key].clientKey).getDownloadURL();
      } catch {
        clientImage = Image.resolveAssetSource(profileImage).uri;
      } finally {
        updatedSessions[key].clientImage = clientImage;
        this.setState({ sessions: updatedSessions });
      }
    });
  }

  renderSessions = () => {
    if (!this.state.sessions.length) {
      return <Text style={styles.subTitle}>No Past Sessions</Text>;
    }

    this.state.sessions.sort((a, b) => (new Date(b.start) - new Date(a.start)));
    return this.state.sessions.map((session) => {
      const date = dateToString(session.start);
      let name;
      let link;

      const image = session.trainerKey === firebase.auth().currentUser.uid
        ? session.clientImage
        : session.trainerImage;

      if (session.type === Constants.personalSessionType) {
        name = session.trainerKey !== firebase.auth().currentUser.uid
          ? session.trainerName
          : session.clientName;
        link = () => Actions.SessionDetailsPage({
          session,
          userRegion: this.state.userRegion,
          managerView: false,
        });
      } else {
        name = session.trainerKey !== firebase.auth().currentUser.uid
          ? session.trainerName
          : session.name;
        link = () => Actions.PastGroupSessionDetailsPage({
          session,
          userRegion: this.state.userRegion,
          managerView: false,
        });
      }

      return (
        <View style={styles.sessionContainer} key={session.key}>
          <Image
            style={styles.profileImage}
            source={{ uri: image || Image.resolveAssetSource(profileImage).uri }}
          />
          <View style={styles.sessionBox}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          <View style={[styles.sessionBox, { position: 'absolute', right: 10 }]}>
            <Text
              style={styles.details}
              onPress={link}
            >
              View Details
            </Text>
          </View>
        </View>
      );
    });
  }

  render() {
    if (!this.state.sessions) {
      return <LoadingWheel />;
    }
    return (
      <ScrollView
        style={{ height: '80%', width: '100%' }}
        contentContainerStyle={styles.container}
      >
        <BackButton />
        <Text style={styles.title}>Past Sessions</Text>
        {this.renderSessions()}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  sessionContainer: {
    width: '100%',
    backgroundColor: Colors.LightGray,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    padding: 10,
  },
  sessionBox: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: Colors.Black,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 18,
    color: Colors.Black,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    margin: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.Black,
  },
  date: {
    fontSize: 13,
    color: Colors.DarkGray,
  },
  details: {
    fontSize: 15,
    color: Colors.Primary,
  },
});
