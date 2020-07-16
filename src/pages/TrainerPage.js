import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import {
  loadUser,
  sendRequest,
  acceptRequest,
  denyRequest,
  loadRecentUsers,
} from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class TrainerPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'recent',
      pressed: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.recentTrainers) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        const recentTrainers = await loadRecentUsers(userId, Constants.trainerType);
        this.setState({ user, recentTrainers });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the trainer page. Please try again later.');
        Actions.MapPage();
      }
    }
  }

  sendRequest = async (trainer) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await sendRequest(userId, trainer.userKey, trainer.gymKey);
      Alert.alert('Request was sent to the trainer.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the request.');
    } finally {
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ user, pressed: false });
    }
  }

  denyRequest = async (request) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await denyRequest(userId, request.userKey, request.key);
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error denying the request.');
    } finally {
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ user, pressed: false });
    }
  }

  acceptRequest = async (request) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await acceptRequest(userId, this.state.user.type, request);
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error accepting the request.');
    } finally {
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ user, pressed: false });
    }
  }

  renderRequests = () => {
    if (!this.state.user.requests) {
      return <Text style={styles.mediumText}>None</Text>;
    }
    return Object.keys(this.state.user.requests).map((key) => {
      const request = this.state.user.requests[key];
      request.key = key;
      return (
        <View key={request.key}>
          <View style={styles.centeredRow}>
            <Text style={styles.nameText}>{request.name}</Text>
          </View>
          <View style={styles.centeredRow}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={() => this.denyRequest(request)}
            >
              <Text style={styles.buttonText}>
                <FontAwesome name="close" size={18} />
                {' '}
                Deny
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => this.acceptRequest(request)}
            >
              <Text style={styles.buttonText}>
                <FontAwesome name="check" size={18} />
                {' '}
                Accept
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  }

  renderTrainers = () => {
    if (!this.state.user.trainers) {
      return <Text style={styles.mediumText}>None</Text>;
    }
    return Object.keys(this.state.user.trainers).map((key) => {
      const trainer = this.state.user.trainers[key];
      return (
        <View key={trainer.userKey} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.name}</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => {
              Actions.BookingPage({
                clientKey: this.state.user.userKey,
                trainerKey: trainer.userKey,
                gymKey: trainer.gymKey,
                bookedBy: Constants.clientType,
              });
            }}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="calendar" size={18} />
              {' '}
              Book
            </Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  renderRecent = () => {
    if (!this.state.recentTrainers || !this.state.recentTrainers.length) {
      return <Text style={styles.mediumText}>None</Text>;
    }

    return this.state.recentTrainers.map((trainer) => {
      let button;
      if (this.state.user.sentRequests && this.state.user.sentRequests[trainer.userKey]) {
        button = (
          <TouchableOpacity style={styles.requestButton} disabled>
            <Text style={styles.buttonText}>
              <FontAwesome name="hourglass" size={18} />
              {' '}
              Pending
            </Text>
          </TouchableOpacity>
        );
      } else {
        button = (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => this.sendRequest(trainer)}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="user-plus" size={18} />
              {' '}
              Add
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <View key={trainer.userKey} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.name}</Text>
          {button}
        </View>
      );
    });
  }

  render() {
    if (!this.state.user || !this.state.recentTrainers || this.state.pressed) {
      return <LoadingWheel />;
    }

    return (
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.title}>Trainers</Text>
        </View>
        <ScrollView
          contentContainerStyle={MasterStyles.flexStartContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subTitle}>Trainer Requests</Text>
          {this.renderRequests()}
          <Text style={styles.subTitle}>Recent Trainers</Text>
          {this.renderRecent()}
          <Text style={styles.subTitle}>Trainers</Text>
          {this.renderTrainers()}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  title: {
    fontSize: 35,
    color: Colors.Primary,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 25,
    color: Colors.Primary,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 5,
  },
  mediumText: {
    fontSize: 25,
    color: Colors.Primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  nameContainer: {
    height: '10%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  centeredRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    marginTop: 10,
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '90%',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    color: Colors.LightGray,
    textAlign: 'center',
  },
  requestButton: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  acceptButton: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    margin: 5,
  },
  denyButton: {
    borderRadius: 5,
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    margin: 5,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '500',
    width: '50%',
    textAlign: 'center',
    color: Colors.Primary,
  },
});
