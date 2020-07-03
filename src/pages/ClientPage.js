import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import {
  loadRecentClients,
  loadUser,
  sendClientRequest,
  loadTrainerRequests,
  acceptTrainerRequest,
  denyTrainerRequest,
} from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class ClientPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'recent',
      pressed: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.recentClients || !this.state.trainerRequests) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const recentClients = await loadRecentClients(userId);
        const trainerRequests = await loadTrainerRequests(userId);
        const user = await loadUser(userId);
        this.setState({ recentClients, trainerRequests, user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the client page. Please try again later');
        this.goToMap();
      }
    }
  }

  sendClientRequest = async (clientKey) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await sendClientRequest(clientKey, userId, this.state.user.name, this.state.user.gym);
      Alert.alert('Request was sent to the client.');
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ user, pressed: false });
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the client a request.');
    }
  }

  denyRequest = async (requestKey, clientKey) => {
    try {
      await denyTrainerRequest(requestKey, clientKey, firebase.auth().currentUser.uid);
      const trainerRequests = loadTrainerRequests(firebase.auth().currentUser.uid);
      this.setState({ trainerRequests });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error denying that request.');
    }
  }

  acceptRequest = async (requestKey, clientKey, clientName) => {
    try {
      const userId = firebase.auth().currentUser.uid;
      await acceptTrainerRequest(
        requestKey,
        userId,
        this.state.user.name,
        clientKey,
        clientName,
        this.state.user.gym,
      );
      const trainerRequests = await loadTrainerRequests(firebase.auth().currentUser.uid);
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ trainerRequests, user });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error accepting that request.');
    }
  }

  renderRequests = () => {
    if (!this.state.trainerRequests || !Array.isArray(this.state.trainerRequests)) {
      return null;
    }
    return this.state.trainerRequests.map((request) => (
      <View key={request.client}>
        <View style={styles.centeredRow}>
          <Text style={styles.nameText}>{request.clientName}</Text>
        </View>
        <View style={styles.centeredRow}>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => this.denyRequest(request.key, request.client)}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="close" size={18} />
              {' '}
              Deny
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => this.acceptRequest(request.key, request.client, request.clientName)}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="check" size={18} />
              {' '}
              Accept
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ));
  }

  renderClients = () => {
    if (!this.state.user.clients) {
      return null;
    }
    return Object.keys(this.state.user.clients).map((key) => {
      const client = this.state.user.clients[key];
      return (
        <View key={key} style={styles.clientRow}>
          <Text style={styles.nameText}>{client.clientName}</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => {
              Actions.BookingPage({
                clientKey: client.client,
                gymKey: this.state.user.gym,
                trainerKey: this.state.user.key,
                bookedBy: Constants.trainerType,
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

  renderRecent = () => this.state.recentClients.map((client) => {
    // if this client currently has requested the trainer or is already a regular client
    if (
      (Array.isArray(this.state.trainerRequests)
      && this.state.trainerRequests.filter((request) => (request.client === client.key)).length > 0)
      || (this.state.user.clients && this.state.user.clients[client.key])
    ) {
      return null;
    }

    let button;
    if (this.state.user.requests && this.state.user.requests[client.key]) {
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
          onPress={() => this.sendClientRequest(client.key)}
        >
          <Text style={styles.buttonText}>
            <FontAwesome name="user-plus" size={18} />
            {' '}
            Add
            {' '}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View key={client.key} style={styles.clientRow}>
        <Text style={styles.nameText}>{client.name}</Text>
        {button}
      </View>
    );
  })

  goToMap = () => {
    Actions.MapPage();
  }

  render() {
    if (
      !this.state.user
      || !this.state.trainerRequests
      || !this.state.recentClients
      || this.state.pressed
    ) {
      return <LoadingWheel />;
    }
    let navBar;
    let content;
    if (this.state.currentTab === 'requests') {
      navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity
            style={styles.activeTab}
            onPress={() => this.setState({ currentTab: 'requests' })}
          >
            <Text style={styles.activeText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'recent' })}
          >
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'clients' })}
          >
            <Text style={styles.navText}>Clients</Text>
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
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'requests' })}
          >
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.activeTab}
            onPress={() => this.setState({ currentTab: 'recent' })}
          >
            <Text style={styles.activeText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'clients' })}
          >
            <Text style={styles.navText}>Clients</Text>
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
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'requests' })}
          >
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inactiveTab}
            onPress={() => this.setState({ currentTab: 'recent' })}
          >
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.activeTab}
            onPress={() => this.setState({ currentTab: 'clients' })}
          >
            <Text style={styles.activeText}>Clients</Text>
          </TouchableOpacity>
        </View>
      );
      content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderClients()}
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
  nameContainer: {
    height: '10%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  navigationBar: {
    width: '100%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
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
  denyButton: {
    borderRadius: 5,
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    margin: 5,
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
