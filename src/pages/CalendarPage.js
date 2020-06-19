import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import bugsnag from '@bugsnag/expo';
import {
  dateToString,
  timeOverlapCheck,
  loadUser,
  loadUpcomingSessions,
  loadPendingSessions,
  loadAcceptedSchedule,
  createSession,
  sendMessage,
  cancelPendingSession,
  cancelUpcomingSession,
  markSessionsAsRead,
  goToPendingRating,
  loadGroupSessions,
  cancelGroupSession,
  leaveGroupSession,
} from '../components/Functions';
import COLORS from '../components/Colors';
import SchedulerModal from '../modals/SchedulerModal';
import TrainerSchedule from '../components/TrainerSchedule';
import GroupSessionModal from '../modals/GroupSessionModal';
import Constants from '../components/Constants';

const loading = require('../images/loading.gif');

export default class CalendarPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scheduleModal: false,
      groupSessionModal: false,
      trainerSchedule: false,
      currentTab: 'pending',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.pendingSessions || !this.state.upcomingSessions) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        await goToPendingRating(user.type, firebase.auth().currentUser.uid);
        const pendingSessions = await loadPendingSessions(userId, user.type);
        const upcomingSessions = await loadUpcomingSessions(userId, user.type);
        const groupSessions = await loadGroupSessions(userId, user.type);
        await markSessionsAsRead(pendingSessions, upcomingSessions, user.type);
        this.setState({
          user, pendingSessions, upcomingSessions, groupSessions,
        });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was as an error loading the schedule page.');
        Actions.reset('MapPage');
      }
    }
  }

  acceptSession = async (session) => {
    // Pulls schedules for trainers and conflicts to check for overlaps
    const trainerSchedule = await loadAcceptedSchedule(session.trainer);
    const clientSchedule = await loadAcceptedSchedule(session.client);
    const endTime = new Date(new Date(session.start).getTime() + (60000 * session.duration));
    let timeConflict = false;

    trainerSchedule.forEach((currSession) => {
      if (timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)) {
        Alert.alert('The Trainer has a session during this time.');
        timeConflict = true;
      }
    });

    clientSchedule.forEach((currSession) => {
      if (timeOverlapCheck(currSession.start, currSession.end, session.start, endTime)) {
        Alert.alert('The client is already booked during this time.');
        timeConflict = true;
      }
    });

    if (timeConflict) {
      return;
    }

    if (
      this.state.user.type === Constants.trainerType
      && this.state.user.trainerType === Constants.managedType
    ) {
      // eslint-disable-next-line
      session.managed = true;
    } else {
      // eslint-disable-next-line
      session.managed = false;
    }
    Alert.alert(
      'Accept Session',
      'Are you sure you want to accept this session?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            // creates session and moves session object to accepted sessions array for state
            try {
              await createSession(session, session.key, session.start, endTime);
              this.state.pendingSessions.splice(this.state.pendingSessions.indexOf(session), 1);
              this.state.upcomingSessions.push(session);
              this.forceUpdate();
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error when accepting the session. Please try again later.');
            }

            // sends appropriate text message to trainer or client who requested session
            let phoneNumber;
            let message;
            if (session.sentBy === 'trainer') {
              phoneNumber = session.trainerPhone;
              message = `${session.clientName} has accepted your session at ${dateToString(session.start)} for ${session.duration} mins`;
            } else {
              phoneNumber = session.clientPhone;
              message = `${session.trainerName} has accepted your session at ${dateToString(session.start)} for ${session.duration} mins`;
            }
            try {
              sendMessage(phoneNumber, message);
            } catch (error) {
              this.bugsnagClient.notify('error');
              Alert.alert('There was an error sending a text message to the other person');
            }
          },
        },
      ],
    );
  }

  cancelSession = (session) => {
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            // cancels pending session and updates array for state
            try {
              await cancelPendingSession(session, session.key);
              this.state.pendingSessions.splice(this.state.pendingSessions.indexOf(session), 1);
              this.forceUpdate();
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was as error cancelling the sessions. Please try again later.');
              return;
            }

            // send appropriate text message to requested user
            let phoneNumber;
            let message;
            if (session.sentBy === Constants.clientType) {
              phoneNumber = session.trainerPhone;
              message = `${session.clientName} has cancelled the requested session at ${dateToString(session.start)} for ${session.duration} mins`;
            } else {
              phoneNumber = session.clientPhone;
              message = `${session.trainerName} has cancelled the requested session at ${dateToString(session.start)} for ${session.duration} mins`;
            }
            try {
              await sendMessage(phoneNumber, message);
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error sending a message to the other person.');
            }
          },
        },
      ],
    );
  }

  // Cancel upcoming session as a client
  cancelUpcomingSession = async (session) => {
    if (new Date(session.start) <= new Date()) {
      Alert.alert('You cannot cancel a session after it has started!');
      return;
    }
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            // cancels accepted session
            try {
              await cancelUpcomingSession(session);
              this.state.upcomingSessions.splice(this.state.upcomingSessions.indexOf(session), 1);
              this.forceUpdate();
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error cancelling this session. Please try again later');
              return;
            }

            // send appropriate text message
            let phoneNumber;
            let message;
            if (this.state.user.type === Constants.trainerType) {
              phoneNumber = session.clientPhone;
              message = `${session.trainerName} has cancelled your session at ${dateToString(session.start)} for ${session.duration} mins`;
            } else {
              phoneNumber = session.trainerPhone;
              message = `${session.clientName} has cancelled your session at ${dateToString(session.start)} for ${session.duration} mins`;
            }
            try {
              await sendMessage(phoneNumber, message);
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error sending a message to the other person.');
            }
          },
        },
      ],
    );
  }

  cancelGroupSession = async (session) => {
    if (session.started) {
      Alert.alert('You cannot cancel a session after it has started!');
      return;
    }
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            // cancels accepted session
            try {
              if (this.state.user.type === Constants.trainerType) {
                await cancelGroupSession(session, session.key);
                this.state.groupSessions.splice(this.state.groupSessions.indexOf(session), 1);
                this.forceUpdate();
              } else {
                await leaveGroupSession(session, session.key);
                this.state.groupSessions.splice(this.state.groupSessions.indexOf(session), 1);
                this.forceUpdate();
              }
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error cancelling this session. Please try again later');
            }
          },
        },
      ],
    );
  }

  renderUpcomingSessions = () => {
    const userKey = firebase.auth().currentUser.uid;
    if (!this.state.upcomingSessions.length && !this.state.groupSessions.length) {
      return (<Text style={styles.navText}>None</Text>);
    }

    const upcomingSessions = this.state.upcomingSessions.map((session) => {
      const displayDate = dateToString(session.start);
      let name;
      if (session.client === userKey) {
        name = (
          <View style={styles.trainerView}>
            <Text style={styles.trainerInfo}>
              {session.trainerName}
            </Text>
          </View>
        );
      } else {
        name = (
          <View style={styles.trainerView}>
            <Text style={styles.trainerInfo}>
              {session.clientName}
            </Text>
          </View>
        );
      }
      return (
        <View
          style={{ flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }}
          key={session.key}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
            {name}
            <View style={styles.rateView}>
              <Text style={styles.trainerInfo}>
                {session.duration}
                {' '}
                min
              </Text>
            </View>
            <View style={styles.timeView}>
              <Text style={styles.trainerInfo}>
                {displayDate}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
            <TouchableOpacity
              style={styles.denyContainer}
              onPress={() => this.cancelUpcomingSession(session)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={() => Actions.SessionPage({ session: session.key })}
            >
              <Text style={styles.buttonText}>Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });

    const groupSessions = this.state.groupSessions.map((session) => {
      const displayDate = dateToString(session.start);
      let cancelButtonText = 'Leave';
      let editButton = null;
      if (this.state.user.type === Constants.trainerType) {
        editButton = (
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => this.setState({
              selectedGroupSessionKey: session.key,
              groupSessionModal: true,
            })}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        );
        cancelButtonText = 'Delete';
      }
      return (
        <View
          style={{ flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }}
          key={session.key}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 40 }}>
            <View style={styles.trainerView}>
              <Text style={styles.trainerInfo}>{session.name}</Text>
            </View>
            <View style={styles.rateView}>
              <Text style={styles.trainerInfo}>
                {session.duration}
                {' '}
                min
              </Text>
            </View>
            <View style={styles.timeView}>
              <Text style={styles.trainerInfo}>
                {displayDate}
              </Text>
            </View>
          </View>
          <View style={{
            flexDirection: 'row', justifyContent: 'center', height: 40, marginBottom: 10,
          }}
          >
            <View style={{ width: '100%', height: 40 }}>
              <Text style={styles.trainerInfo}>
                {session.clientCount}
                {' '}
                /
                {' '}
                {session.capacity}
                {' '}
                clients joined
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
            <TouchableOpacity
              style={styles.denyContainer}
              onPress={() => this.cancelGroupSession(session)}
            >
              <Text style={styles.buttonText}>{cancelButtonText}</Text>
            </TouchableOpacity>
            {editButton}
          </View>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-around', height: 50, marginBottom: 20,
          }}
          >
            <TouchableOpacity
              style={[styles.scheduleButton, { backgroundColor: COLORS.PRIMARY }]}
              onPress={() => Actions.GroupSessionPage({ session: session.key })}
            >
              <Text style={styles.buttonText}>Enter Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });

    return upcomingSessions.concat(groupSessions);
  }

  renderPendingSessions = () => {
    const userKey = firebase.auth().currentUser.uid;
    if (!this.state.pendingSessions.length) {
      return (<Text style={styles.navText}>None</Text>);
    }

    return this.state.pendingSessions.map((session) => {
      const displayDate = dateToString(session.start);
      let button;
      let button2;
      let name;
      if (
        (session.client === userKey && session.sentBy === Constants.clientType)
        || (session.trainer === userKey && session.sentBy === Constants.trainerType)
      ) {
        button = (
          <TouchableOpacity
            style={styles.denyContainer}
            onPress={() => this.cancelSession(session)}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        );
        if (session.client === userKey) {
          name = (
            <View style={styles.trainerView}>
              <Text style={styles.trainerInfo}>
                {session.trainerName}
              </Text>
            </View>
          );
        } else {
          name = (
            <View style={styles.trainerView}>
              <Text style={styles.trainerInfo}>
                {session.clientName}
              </Text>
            </View>
          );
        }
      } else {
        button = (
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => this.acceptSession(session)}
          >
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
        );
        button2 = (
          <TouchableOpacity
            style={styles.denyContainer}
            onPress={() => this.cancelSession(session)}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        );
        if (session.client === userKey) {
          name = (
            <View style={styles.trainerView}>
              <Text style={styles.trainerInfo}>
                {session.trainerName}
              </Text>
            </View>
          );
        } else {
          name = (
            <View style={styles.trainerView}>
              <Text style={styles.trainerInfo}>
                {session.clientName}
              </Text>
            </View>
          );
        }
      }
      return (
        <View
          style={{ flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }}
          key={session.key}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
            {name}
            <View style={styles.rateView}>
              <Text style={styles.trainerInfo}>
                {session.duration}
                {' '}
                min
              </Text>
            </View>
            <View style={styles.timeView}>
              <Text style={styles.trainerInfo}>
                {displayDate}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: 50 }}>
            {button2}
            {button}
          </View>
        </View>
      );
    });
  }

  goActive = async () => {
    const userId = firebase.auth().currentUser.uid;
    await firebase.database().ref('users').child(userId).update({ active: true });
    await firebase.database().ref(`/gyms/${this.state.user.gym}/trainers/${userId}`).update({
      active: true,
    });
    Alert.alert('You are active now');
    this.state.user.active = true;
    this.forceUpdate();
  }

  hideScheduleModalAndConfirm = () => {
    this.hideScheduleModal();
    setTimeout(() => Alert.alert('Availability Added.'), 700);
  }

  hideGroupSessionModalAndConfirm = async () => {
    this.hideGroupSessionModal();
    const groupSessions = await loadGroupSessions(
      firebase.auth().currentUser.uid,
      Constants.trainerType,
    );
    this.setState({ groupSessions, selectedGroupSessionKey: null });
    setTimeout(() => Alert.alert('Group Session Created or Updated.'), 700);
  }

  hideScheduleModal = () => this.setState({ scheduleModal: false });

  hidetrainerSchedule = () => this.setState({ trainerSchedule: false });

  hideGroupSessionModal = () => this.setState({ groupSessionModal: false });

  render() {
    if (!this.state.upcomingSessions || !this.state.user || !this.state.pendingSessions) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }
    let activeStatus;
    let viewScheduleButton;
    let addScheduleButton;
    let groupSessionButton;
    if (this.state.user.type === Constants.trainerType) {
      if (this.state.user.active) {
        activeStatus = (<Text style={styles.statusText}>Currently Active</Text>);
      } else {
        activeStatus = (
          <TouchableOpacity
            style={styles.activeButton}
            onPress={() => this.goActive()}
          >
            <Text style={styles.buttonText}>Go Active</Text>
          </TouchableOpacity>
        );
      }
      viewScheduleButton = (
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => this.setState({ scheduleModal: true })}
        >
          <Text style={styles.buttonText}>Set Schedule</Text>
        </TouchableOpacity>
      );
      addScheduleButton = (
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => this.setState({ trainerSchedule: true })}
        >
          <Text style={styles.buttonText}>View Schedule</Text>
        </TouchableOpacity>
      );
      groupSessionButton = (
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => this.setState({ groupSessionModal: true })}
        >
          <Text style={styles.buttonText}>Create Group Session</Text>
        </TouchableOpacity>
      );
    }
    const sessionHolder = this.state.currentTab === 'pending'
      ? this.renderPendingSessions()
      : this.renderUpcomingSessions();
    const content = (
      <View style={styles.sessionContainer}>
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          {sessionHolder}
          {activeStatus}
          {viewScheduleButton}
          {addScheduleButton}
          {groupSessionButton}
        </ScrollView>
      </View>
    );
    const pendingTabStyle = this.state.currentTab === 'pending' ? styles.activeTab : styles.inactiveTab;
    const upcomingTabStyle = this.state.currentTab === 'accepted' ? styles.activeTab : styles.inactiveTab;
    const pendingTabText = this.state.currentTab === 'pending' ? styles.activeText : styles.navText;
    const upcomingTabText = this.state.currentTab === 'accepted' ? styles.activeText : styles.navText;
    const navBar = (
      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={pendingTabStyle}
          onPress={() => this.setState({ currentTab: 'pending' })}
        >
          <Text style={pendingTabText}>Awaiting Responses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={upcomingTabStyle}
          onPress={() => this.setState({ currentTab: 'accepted' })}
        >
          <Text style={upcomingTabText}>Upcoming Sessions</Text>
        </TouchableOpacity>
      </View>
    );
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.backButton} onPress={() => Actions.reset('MapPage')}>
            <FontAwesome name="arrow-left" size={35} />
          </Text>
          <Text style={styles.title}> Calendar </Text>
        </View>
        {navBar}
        {content}
        <Modal
          isVisible={this.state.scheduleModal}
          onBackdropPress={this.hideScheduleModal}
        >
          <SchedulerModal
            trainerKey={firebase.auth().currentUser.uid}
            hide={this.hideScheduleModal}
            hideandConfirm={this.hideScheduleModalAndConfirm}
          />
        </Modal>
        <Modal
          isVisible={this.state.trainerSchedule}
          onBackdropPress={this.hideTrainerSchedule}
        >
          <TrainerSchedule
            trainerKey={firebase.auth().currentUser.uid}
            hideAndOpen={this.hidetrainerSchedule}
          />
        </Modal>
        <Modal
          isVisible={this.state.groupSessionModal}
          onBackdropPress={this.hideGroupSessionModal}
        >
          <GroupSessionModal
            trainerKey={firebase.auth().currentUser.uid}
            hide={this.hideGroupSessionModal}
            hideAndConfirm={this.hideGroupSessionModalAndConfirm}
            sessionKey={this.state.selectedGroupSessionKey}
          />
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  sessionContainer: {
    flex: 7,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  headerContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 35,
    color: COLORS.PRIMARY,
    fontWeight: '700',
    textAlign: 'center',
  },
  navigationBar: {
    width: '100%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  activeTab: {
    width: '50%',
    backgroundColor: COLORS.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
  },
  inactiveTab: {
    width: '50%',
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY,
  },
  navText: {
    fontSize: 25,
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  activeText: {
    fontSize: 25,
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  trainerView: {
    width: '33%',
    height: 50,
  },
  timeView: {
    width: '37%',
    height: 50,
  },
  trainerInfo: {
    paddingVertical: 18,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  rateView: {
    width: '20%',
    height: 50,
  },
  buttonContainer: {
    borderRadius: 5,
    width: 100,
    padding: 10,
    height: 48,
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  activeButton: {
    borderRadius: 5,
    padding: 15,
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: 20,
  },
  scheduleButton: {
    borderRadius: 5,
    padding: 15,
    width: '80%',
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: 15,
  },
  denyContainer: {
    borderRadius: 5,
    width: 100,
    padding: 10,
    height: 48,
    backgroundColor: COLORS.RED,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700',
    fontSize: 20,
  },
  statusText: {
    textAlign: 'center',
    color: COLORS.SECONDARY,
    fontWeight: '700',
    fontSize: 25,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35,
    paddingBottom: 5,
    fontWeight: '700',
    color: COLORS.SECONDARY,
  },
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
