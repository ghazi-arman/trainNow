import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { FontAwesome } from '@expo/vector-icons';
import {
  dateToString,
  timeOverlapCheck,
  loadUser,
  loadAcceptedSessions,
  loadPendingSessions,
  loadAcceptedSchedule,
  createSession,
  sendMessage,
  cancelPendingSession,
  cancelAcceptedSession,
  markSessionsAsRead,
  goToPendingRating,
  loadGroupSessions,
  cancelGroupSession,
  leaveGroupSession,
  showFirstTimeMessage,
} from '../components/Functions';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';
import profileImage from '../images/profile.png';

export default class CalendarPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'pending',
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.pendingSessions || !this.state.upcomingSessions) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        await goToPendingRating(firebase.auth().currentUser.uid, user.type);
        const pendingSessions = await loadPendingSessions(userId, user.type);
        this.loadImages(pendingSessions, 'pendingSessions');
        const upcomingSessions = await loadAcceptedSessions(userId, user.type);
        this.loadImages(upcomingSessions, 'upcomingSessions');
        const groupSessions = await loadGroupSessions(userId, user.type);
        this.loadImages(groupSessions, 'groupSessions');
        await markSessionsAsRead(pendingSessions, upcomingSessions, user.type);
        await showFirstTimeMessage(firebase.auth().currentUser.uid);
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

  loadImages = (sessions, sessionType) => {
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
        this.setState({ [sessionType]: updatedSessions });
      }
      let clientImage;
      try {
        clientImage = await firebase.storage().ref()
          .child(sessions[key].clientKey).getDownloadURL();
      } catch {
        clientImage = Image.resolveAssetSource(profileImage).uri;
      } finally {
        updatedSessions[key].clientImage = clientImage;
        this.setState({ [sessionType]: updatedSessions });
      }
    });
  }

  acceptSession = async (session) => {
    // Pulls schedules for trainers and conflicts to check for overlaps
    const trainerSchedule = await loadAcceptedSchedule(session.trainerKey);
    const clientSchedule = await loadAcceptedSchedule(session.clientKey);
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
  cancelAcceptedSession = async (session) => {
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
              await cancelAcceptedSession(session);
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

  renderPendingSessions = () => {
    const userKey = firebase.auth().currentUser.uid;
    if (!this.state.pendingSessions.length) {
      return ([
        <Text style={styles.subTitle} key={0}>Pending Sessions</Text>,
        <Text style={styles.noneText} key={1}>No Pending Sessions</Text>,
      ]);
    }

    const pendingSessions = this.state.pendingSessions.map((session) => {
      let button;
      let button2;
      let name;
      const image = session.clientKey === userKey ? session.trainerImage : session.clientImage;
      if (
        (session.clientKey === userKey && session.sentBy === Constants.clientType)
        || (session.trainerKey === userKey && session.sentBy === Constants.trainerType)
      ) {
        button = (
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.cancelSession(session)}
          >
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Cancel</Text>
          </TouchableOpacity>
        );
        name = session.clientKey === userKey ? session.trainerName : session.clientName;
      } else {
        button = (
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.acceptSession(session)}
          >
            <Text style={[styles.buttonText, { color: Colors.Green }]}>Accept</Text>
          </TouchableOpacity>
        );
        button2 = (
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.cancelSession(session)}
          >
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Reject</Text>
          </TouchableOpacity>
        );
        name = session.clientKey === userKey ? session.trainerName : session.clientName;
      }
      return (
        <View style={styles.sessionContainer} key={session.key}>
          <View style={styles.sessionInfo}>
            <Image
              style={styles.profileImage}
              source={{ uri: image || Image.resolveAssetSource(profileImage).uri }}
            />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.details}>
              {session.duration}
              {' '}
              minutes
            </Text>
            <Text style={styles.details}>{dateToString(session.start)}</Text>
            <Text style={styles.details}>{session.gymName}</Text>
          </View>
          <View style={styles.buttonColumn}>
            {button2}
            {button}
          </View>
        </View>
      );
    });

    return ([
      <Text style={styles.subTitle} key={0}>Pending Sessions</Text>,
      pendingSessions,
    ]);
  }

  renderUpcomingSessions = () => {
    const userKey = firebase.auth().currentUser.uid;
    if (!this.state.upcomingSessions.length && !this.state.groupSessions.length) {
      return ([
        <Text style={styles.subTitle} key={0}>Upcoming Sessions</Text>,
        <Text style={styles.noneText} key={1}>No Upcoming Sessions</Text>,
      ]);
    }

    const upcomingSessions = this.state.upcomingSessions.map((session) => {
      const name = session.clientKey === userKey ? session.trainerName : session.clientName;
      const image = session.clientKey === userKey ? session.trainerImage : session.clientImage;
      return (
        <View style={styles.sessionContainer} key={session.key}>
          <View style={styles.sessionInfo}>
            <Image
              style={styles.profileImage}
              source={{ uri: image || Image.resolveAssetSource(profileImage).uri }}
            />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.details}>
              {session.duration}
              {' '}
              minutes
            </Text>
            <Text style={styles.details}>{dateToString(session.start)}</Text>
            <Text style={styles.details}>{session.gymName}</Text>
          </View>
          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => this.cancelAcceptedSession(session)}
            >
              <Text style={[styles.buttonText, { color: Colors.Red }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => Actions.SessionPage({ session: session.key })}
            >
              <Text style={[styles.buttonText, { color: Colors.Green }]}>Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });

    const groupSessions = this.state.groupSessions.map((session) => {
      const cancelButtonText = this.state.user.type === Constants.trainerType ? 'Delete' : 'Leave';
      const editButton = this.state.user.type === Constants.trainerType
        ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => Actions.CreateGroupSessionPage({ sessionKey: session.key })}
          >
            <Text style={[styles.buttonText, { color: Colors.Black }]}>Edit</Text>
          </TouchableOpacity>
        )
        : null;
      const image = session.trainerKey === userKey ? session.clientImage : session.trainerImage;
      const name = session.trainerKey === userKey ? null : session.trainerName;
      return (
        <View style={[styles.sessionContainer, { height: 170 }]} key={session.key}>
          <View style={styles.sessionInfo}>
            <Image
              style={styles.profileImage}
              source={{ uri: image || Image.resolveAssetSource(profileImage).uri }}
            />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={styles.name}>{session.name}</Text>
            { name ? <Text style={styles.details}>{name}</Text> : null }
            <Text style={styles.details}>
              {session.clientCount}
              {' '}
              /
              {' '}
              {session.capacity}
            </Text>
            <Text style={styles.details}>
              {session.duration}
              {' '}
              minutes
            </Text>
            <Text style={styles.details}>{dateToString(session.start)}</Text>
            <Text style={styles.details}>{session.gymName}</Text>
          </View>
          <View style={styles.buttonColumn}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => this.cancelGroupSession(session)}
            >
              <Text style={[styles.buttonText, { color: Colors.Red }]}>{cancelButtonText}</Text>
            </TouchableOpacity>
            {editButton}
            <TouchableOpacity
              style={styles.button}
              onPress={() => Actions.GroupSessionPage({ session: session.key })}
            >
              <Text style={[styles.buttonText, { color: Colors.Green }]}>Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });

    return ([
      <Text style={styles.subTitle} key={0}>Upcoming Sessions</Text>,
      upcomingSessions,
      groupSessions,
    ]);
  }

  render() {
    if (!this.state.user || !this.state.upcomingSessions || !this.state.pendingSessions) {
      return <LoadingWheel />;
    }
    const userId = firebase.auth().currentUser.uid;
    return (
      <View style={CommonStyles.flexStartContainer}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={styles.container}
        >
          <BackButton onPress={Actions.MapPage} />
          <Text style={styles.title}>Calendar</Text>
          {this.state.user.type === Constants.trainerType
            ? (
              <View style={styles.buttonRow}>
                <View style={styles.buttonBox}>
                  <TouchableOpacity style={styles.centered} onPress={Actions.SchedulerPage}>
                    <FontAwesome style={styles.icon} name="calendar" color={Colors.Primary} size={30} />
                    <Text>Set Schedule</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonBox}>
                  <TouchableOpacity
                    style={styles.centered}
                    onPress={() => Actions.SchedulePage({ trainerKey: userId })}
                  >
                    <FontAwesome style={styles.icon} name="search" color={Colors.Primary} size={30} />
                    <Text>View Schedule</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonBox}>
                  <TouchableOpacity
                    style={styles.centered}
                    onPress={Actions.CreateGroupSessionPage}
                  >
                    <FontAwesome style={styles.icon} name="plus" color={Colors.Primary} size={30} />
                    <Text>Create Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
            : null}
          {this.renderPendingSessions()}
          {this.renderUpcomingSessions()}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sessionContainer: {
    minHeight: 150,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 20,
    backgroundColor: Colors.LightGray,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    marginBottom: 10,
  },
  sessionInfo: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  buttonColumn: {
    ...CommonStyles.shadow,
    height: '100%',
    position: 'absolute',
    right: 15,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileImage: {
    height: 50,
    width: 50,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  details: {
    fontSize: 15,
    color: Colors.DarkGray,
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    color: Colors.Black,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: Colors.Black,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  noneText: {
    fontSize: 18,
    margin: 10,
    marginHorizontal: 15,
  },
  button: {
    borderRadius: 10,
    width: 100,
    height: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.Black,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonRow: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.LightGray,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
  },
  buttonBox: {
    width: '33%',
    height: '90%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
});
