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
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import {
  loadSessions, dateToString,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import profileImage from '../images/profile.png';

export default class ManagerHistoryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      reportModal: false,
      report: '',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    try {
      const sessions = await loadSessions(this.props.userKey);
      this.loadImages(sessions);
      this.setState({ sessions });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error loading the history for that trainer.');
      Actions.pop();
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
    this.state.sessions.sort((a, b) => (new Date(b.start) - new Date(a.start)));
    return this.state.sessions.map((session) => {
      const date = dateToString(session.start);
      let name;
      let link;

      const image = session.trainerKey === this.props.userKey
        ? session.clientImage
        : session.trainerImage;

      if (session.type === Constants.personalSessionType) {
        name = session.trainerKey !== this.props.userKey
          ? session.trainerName
          : session.clientName;
        link = () => Actions.SessionDetailsPage({ session, managerView: true });
      } else {
        name = session.trainerKey !== this.props.userKey
          ? session.trainerName
          : session.name;
        link = () => Actions.PastGroupSessionDetailsPage({ session, managerView: true });
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
            <Text style={styles.details} onPress={link}>View Details</Text>
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

ManagerHistoryPage.propTypes = {
  userKey: PropTypes.string.isRequired,
};

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
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '700',
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
