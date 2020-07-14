import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import firebase from 'firebase';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import {
  loadSessions, renderStars, reportSession, dateToTime,
} from '../components/Functions';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class ManagerHistoryPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      reportModal: false,
      report: '',
    };
    this.bugsnagClient = bugsnag();
  }

  // load font after render the page
  async componentDidMount() {
    try {
      const sessions = await loadSessions(this.props.userKey);
      this.setState({ sessions });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error loading the history for that trainer.');
      Actions.pop();
    }
  }

  hideReportModal = () => this.setState({ reportModal: false, report: '' });

  reportSession = async (session) => {
    this.hideReportModal();
    reportSession(session, session.trainer, this.state.report);
    setTimeout(() => Alert.alert('Session Reported!'), 1000);
  }

  renderSessions = () => {
    this.state.sessions.sort((a, b) => (new Date(b.start) - new Date(a.start)));
    return this.state.sessions.map((session) => {
      const startDate = dateToTime(session.start);
      const endDate = dateToTime(session.end);
      const day = `${new Date(session.start).getMonth() + 1} / ${new Date(session.start).getDate()}`;
      const minutes = Math.floor(((new Date(session.end) - new Date(session.start)) / 1000) / 60);
      const rate = (minutes * (session.rate / 60)).toFixed(2);
      const percentage = session.regular
        ? Constants.regularClientPercentage
        : Constants.newClientPercentage;
      let payout = (rate - rate * percentage).toFixed(2);

      let rateView;
      let client;
      let stars;
      if (session.type === Constants.personalSessionType) {
        if (session.trainerKey !== firebase.auth().currentUser.uid) {
          rateView = (
            <View style={styles.sessionRow}>
              <Text style={styles.smallText}>
                $
                {rate}
              </Text>
            </View>
          );
          client = (
            <Text style={styles.titleText}>
              Trained by
              {' '}
              {session.trainerName}
            </Text>
          );
          stars = renderStars(session.clientRating);
        } else {
          rateView = (
            <View style={styles.sessionRow}>
              <Text style={styles.smallText}>
                $
                {payout}
              </Text>
            </View>
          );
          client = (
            <Text style={styles.titleText}>
              You trained
              {' '}
              {session.clientName}
            </Text>
          );
          stars = renderStars(session.trainerRating);
        }
      } else if (session.trainerKey !== firebase.auth().currentUser.uid) {
        rateView = (
          <View style={styles.sessionRow}>
            <Text style={styles.smallText}>
              $
              {session.cost}
            </Text>
          </View>
        );
        client = (
          <Text style={styles.titleText}>
            Trained by
            {session.trainerName}
          </Text>
        );
        stars = renderStars(session.clients[firebase.auth().currentUser.uid].rating);
      } else {
        // eslint-disable-next-line
        payout = ((session.cost - session.cost * Constants.groupSessionPercentage) * session.clientCount)
          .toFixed(2);
        rateView = (
          <View style={styles.sessionRow}>
            <Text style={styles.smallText}>
              $
              {payout}
            </Text>
          </View>
        );
        client = (
          <Text style={styles.titleText}>
            You trained
            {session.clientCount}
            {' '}
            clients
          </Text>
        );
        stars = renderStars(session.trainerRating);
      }

      return (
        <View style={styles.sessionContainer} key={session.key}>
          <View style={styles.sessionRow}>{client}</View>
          <View style={styles.sessionRow}>
            <Text style={styles.icon}>{stars}</Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.smallText}>{session.gymName}</Text>
          </View>
          {rateView}
          <View style={styles.sessionRow}>
            <Text style={styles.smallText}>{day}</Text>
          </View>
          <View style={styles.sessionRow}>
            <Text style={styles.timeText}>
              {startDate}
              {' '}
              to
              {' '}
              {endDate}
            </Text>
          </View>
          <View style={styles.sessionRow}>
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={() => this.setState({ reportModal: true, reportSession: session })}
            >
              <Text style={styles.buttonText}>Report Session</Text>
            </TouchableOpacity>
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
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.header}>Past Sessions</Text>
        </View>
        <View style={styles.historyContainer}>
          <ScrollView
            contentContainerStyle={MasterStyles.flexStartContainer}
            showsVerticalScrollIndicator={false}
          >
            {this.renderSessions()}
          </ScrollView>
        </View>
        <Modal
          isVisible={this.state.reportModal}
          onBackdropPress={this.hideReportModal}
        >
          <KeyboardAvoidingView behavior="padding" style={styles.reportModal}>
            <Text style={styles.closeButton} onPress={this.hideReportModal}>
              <FontAwesome name="close" size={35} />
            </Text>
            <Text style={styles.titleText}>Report Session</Text>
            <TextInput
              placeholder="What was the problem?"
              style={styles.input}
              returnKeyType="done"
              multiline
              placeholderTextColor={Colors.Primary}
              onChangeText={(report) => this.setState({ report })}
              value={this.state.report}
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => this.reportSession(this.state.reportSession)}
            >
              <Text style={styles.buttonText}>Report Session</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }
}

ManagerHistoryPage.propTypes = {
  userKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  reportModal: {
    flex: 0.6,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.White,
    borderRadius: 10,
  },
  historyContainer: {
    width: '100%',
    flex: 6,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionContainer: {
    width: '90%',
    backgroundColor: '#f6f5f5',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.Primary,
    marginTop: 20,
  },
  sessionRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  halfRow: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  header: {
    marginTop: 45,
    fontSize: 30,
    fontWeight: '700',
    color: Colors.Primary,
  },
  titleText: {
    fontSize: 25,
    textAlign: 'center',
    fontWeight: '600',
    color: Colors.Primary,
  },
  smallText: {
    fontSize: 20,
    fontWeight: '400',
    color: Colors.Primary,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.Primary,
  },
  icon: {
    color: Colors.Secondary,
    fontSize: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 35,
    color: Colors.Red,
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#f6f5f5',
    fontWeight: '500',
  },
  buttonContainer: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    padding: 15,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  submitButton: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: '80%',
  },
  input: {
    height: '50%',
    width: '80%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.Primary,
    color: Colors.Primary,
  },
});
