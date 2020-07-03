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
  loadRecentTrainers,
  loadClientRequests,
  acceptClientRequest,
  sendTrainerRequest,
  denyClientRequest,
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
    if (!this.state.user || !this.state.recentTrainers || !this.state.clientRequests) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        const recentTrainers = await loadRecentTrainers(userId);
        const clientRequests = await loadClientRequests(userId);
        this.setState({ user, recentTrainers, clientRequests });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the trainer page. Please try again later.');
        this.goToMap();
      }
    }
  }

  sendTrainerRequest = async (trainerKey, clientName, gymKey) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await sendTrainerRequest(trainerKey, clientName, userId, gymKey);
      Alert.alert('Request was sent to the trainer.');
      const user = await loadUser(userId);
      this.setState({ user, pressed: false });
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the request.');
    }
  }

  denyRequest = async (requestKey, trainerKey) => {
    try {
      const userId = firebase.auth().currentUser.uid;
      await denyClientRequest(requestKey, userId, trainerKey);
      const clientRequests = await loadClientRequests(userId);
      this.setState({ clientRequests });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error denying the request.');
    }
  }

  acceptRequest = async (requestKey, trainerKey, trainerName, gymKey) => {
    try {
      await acceptClientRequest(
        requestKey,
        trainerKey,
        trainerName,
        firebase.auth().currentUser.uid,
        this.state.user.name,
        gymKey,
      );
      const clientRequests = await loadClientRequests(firebase.auth().currentUser.uid);
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ clientRequests, user });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error accepting the request.');
    }
  }

  renderRequests = () => (
    this.state.clientRequests.map((request) => (
      <View key={request.trainer}>
        <View style={styles.centeredRow}>
          <Text style={styles.navText}>{request.trainerName}</Text>
        </View>
        <View style={styles.centeredRow}>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => this.denyRequest(request.key, request.trainer)}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="close" size={18} />
              {' '}
              Deny
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => this.acceptRequest(
              request.key,
              request.trainer,
              request.trainerName,
              request.gym,
            )}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="check" size={18} />
              {' '}
              Accept
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ))
  )

  renderTrainers = () => {
    if (!this.state.user.trainers) {
      return null;
    }
    return Object.keys(this.state.user.trainers).map((key) => {
      const trainer = this.state.user.trainers[key];
      return (
        <View key={trainer.trainer} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.trainerName}</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => {
              Actions.BookingPage({
                clientKey: this.state.user.key,
                trainerKey: trainer.trainer,
                gymKey: trainer.gym,
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

  renderRecent = () => (
    this.state.recentTrainers.map((trainer) => {
      const clientRequests = this.state.clientRequests.filter(
        (request) => request.trainer === trainer.key,
      );
      if (clientRequests.length > 0
        || (this.state.user.trainers && this.state.user.trainers[trainer.key])) {
        return null;
      }

      let button;
      if (this.state.user.requests && this.state.user.requests[trainer.key]) {
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
            onPress={() => this.sendTrainerRequest(trainer.key, this.state.user.name, trainer.gym)}
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
        <View key={trainer.key} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.name}</Text>
          {button}
        </View>
      );
    })
  )

  goToMap = () => {
    Actions.MapPage();
  }

  render() {
    if (
      !this.state.user
      || !this.state.clientRequests
      || !this.state.recentTrainers
      || this.state.pressed
    ) {
      return <LoadingWheel />;
    }
    let navBar = null;
    let content = null;
    if (this.state.currentTab === 'requests') {
      navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'requests' })}>
            <Text style={styles.activeText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'recent' })}>
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'trainers' })}>
            <Text style={styles.navText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderRequests()}
        </ScrollView>
      );
    } else if (this.state.currentTab === 'recent') {
      navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'requests' })}>
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'recent' })}>
            <Text style={styles.activeText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'trainers' })}>
            <Text style={styles.navText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderRecent()}
        </ScrollView>
      );
    } else {
      navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'requests' })}>
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'recent' })}>
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'trainers' })}>
            <Text style={styles.activeText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderTrainers()}
        </ScrollView>
      );
    }
    return (
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.title}>Trainers</Text>
        </View>
        {navBar}
        {content}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    color: Colors.Primary,
    fontWeight: '700',
  },
  navigationBar: {
    width: '100%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
  },
  nameContainer: {
    height: '10%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  activeTab: {
    width: '33%',
    paddingVertical: 20,
    backgroundColor: Colors.Primary,
    borderWidth: 1,
    borderColor: Colors.Secondary,
  },
  inactiveTab: {
    width: '33%',
    paddingVertical: 20,
    backgroundColor: Colors.White,
    borderWidth: 1,
    borderColor: Colors.Secondary,
  },
  navText: {
    fontSize: 23,
    fontWeight: '600',
    color: Colors.Primary,
    textAlign: 'center',
  },
  activeText: {
    fontSize: 23,
    fontWeight: '600',
    color: Colors.White,
    textAlign: 'center',
  },
  centeredRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    marginTop: 10,
    paddingLeft: 27,
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
    color: Colors.White,
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
  icon: {
    fontSize: 15,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '500',
    width: '50%',
    textAlign: 'center',
    color: Colors.Primary,
  },
});
