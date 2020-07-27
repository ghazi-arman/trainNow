import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import {
  loadRecentUsers,
  loadUser,
  sendRequest,
  acceptRequest,
  denyRequest,
} from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import profileImage from '../images/profile.png';

export default class ClientsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'recent',
      pressed: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.recentClients) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        const recentClients = await loadRecentUsers(userId, Constants.clientType);
        this.loadImages(user, recentClients);
        this.setState({ recentClients, user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the client page. Please try again later');
        Actions.MapPage();
      }
    }
  }

  loadImages = (user, recentClients) => {
    const updatedUser = user;
    const updatedClients = recentClients;
    if (updatedUser.clients) {
      Object.keys(updatedUser.clients).map(async (key) => {
        try {
          updatedUser.clients[key].image = await firebase.storage()
            .ref().child(key).getDownloadURL();
        } catch {
          updatedUser.clients[key].image = Image.resolveAssetSource(profileImage).uri;
        } finally {
          this.setState({ user: updatedUser });
        }
      });
    }
    if (updatedUser.requests) {
      Object.keys(updatedUser.requests).map(async (key) => {
        try {
          updatedUser.requests[key].image = await firebase.storage()
            .ref().child(key).getDownloadURL();
        } catch {
          updatedUser.requests[key].image = Image.resolveAssetSource(profileImage).uri;
        } finally {
          this.setState({ user: updatedUser });
        }
      });
    }
    if (updatedClients) {
      Object.keys(updatedClients).map(async (key) => {
        try {
          updatedClients[key].image = await firebase.storage()
            .ref().child(updatedClients[key].userKey).getDownloadURL();
        } catch {
          updatedClients[key].image = Image.resolveAssetSource(profileImage).uri;
        } finally {
          this.setState({ recentClients: updatedClients });
        }
      });
    }
  }

  sendRequest = async (client) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await sendRequest(userId, client.userKey, client.gymKey);
      Alert.alert('Request was sent to the client.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the client a request.');
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
      Alert.alert('There was an error denying that request.');
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
      Alert.alert('There was an error accepting that request.');
    } finally {
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ user, pressed: false });
    }
  }

  renderRequests = () => {
    if (!this.state.user.requests) {
      return null;
    }
    const requests = Object.keys(this.state.user.requests).map((key) => {
      const request = this.state.user.requests[key];
      request.key = key;
      return (
        <View style={styles.rowContainer} key={request.key}>
          <Image
            style={styles.profileImage}
            source={{
              uri: request.image
                ? request.image
                : Image.resolveAssetSource(profileImage).uri,
            }}
          />
          <Text style={styles.name}>{request.name}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPress={() => this.denyRequest(request)}
            >
              <Text style={[styles.buttonText, { color: Colors.Red }]}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPress={() => this.acceptRequest(request)}
            >
              <Text style={[styles.buttonText, { color: Colors.Green }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
    return ([
      <Text style={styles.subTitle}>Trainer Requests</Text>,
      requests,
    ]);
  }

  renderRecent = () => {
    if (!this.state.recentClients || !this.state.recentClients.length) {
      return null;
    }

    const recentClients = this.state.recentClients.map((client) => {
      let button;
      if (this.state.user.sentRequests && this.state.user.sentRequests[client.userKey]) {
        button = (
          <TouchableOpacity style={[styles.button, MasterStyles.shadow]} disabled>
            <Text style={styles.buttonText}>Pending</Text>
          </TouchableOpacity>
        );
      } else {
        button = (
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={() => this.sendRequest(client)}
          >
            <Text style={[styles.buttonText, { color: Colors.Green }]}>Add</Text>
          </TouchableOpacity>
        );
      }
      return (
        <View key={client.userKey} style={styles.rowContainer}>
          <Image
            style={styles.profileImage}
            source={{
              uri: client.image
                ? client.image
                : Image.resolveAssetSource(profileImage).uri,
            }}
          />
          <Text style={styles.name}>{client.name}</Text>
          <View style={styles.buttonRow}>
            {button}
          </View>
        </View>
      );
    });
    return ([
      <Text style={styles.subTitle}>Recent Clients</Text>,
      recentClients,
    ]);
  }

  renderClients = () => {
    if (!this.state.user.clients) {
      return null;
    }
    const clients = Object.keys(this.state.user.clients).map((key) => {
      const client = this.state.user.clients[key];
      return (
        <View key={key} style={styles.rowContainer}>
          <Image
            style={styles.profileImage}
            source={{
              uri: client.image
                ? client.image
                : Image.resolveAssetSource(profileImage).uri,
            }}
          />
          <Text style={styles.name}>{client.name}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPress={() => {
                Actions.BookingPage({
                  clientKey: client.userKey,
                  gymKey: client.gymKey,
                  trainerKey: this.state.user.userKey,
                  bookedBy: Constants.trainerType,
                });
              }}
            >
              <Text style={[styles.buttonText, { color: Colors.Green }]}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
    return ([
      <Text style={styles.subTitle}>Clients</Text>,
      clients,
    ]);
  }

  render() {
    if (!this.state.user || !this.state.recentClients || this.state.pressed) {
      return <LoadingWheel />;
    }
    return (
      <View style={MasterStyles.flexStartContainer}>
        <View style={styles.buttonContainer}>
          <BackButton />
        </View>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Clients</Text>
          {this.renderRequests()}
          {this.renderRecent()}
          {this.renderClients()}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    margin: 10,
  },
  subTitle: {
    fontSize: 25,
    fontWeight: '600',
    textAlign: 'center',
    margin: 10,
  },
  mediumText: {
    fontSize: 20,
    color: Colors.Primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonContainer: {
    height: '12%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  rowContainer: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.LightGray,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
  },
  buttonRow: {
    flexDirection: 'row',
    position: 'absolute',
    right: 10,
  },
  buttonText: {
    fontSize: 15,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    width: 100,
    margin: 5,
  },
  name: {
    fontSize: 15,
    margin: 10,
  },
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    margin: 5,
  },
});
