import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import firebase from 'firebase';
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
import profileImage from '../images/profile.png';

export default class TrainersPage extends Component {
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
        this.loadImages(user, recentTrainers);
        this.setState({ user, recentTrainers });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the trainer page. Please try again later.');
        Actions.MapPage();
      }
    }
  }

  loadImages = (user, recentTrainers) => {
    const updatedUser = user;
    const updatedTrainers = recentTrainers;
    if (updatedUser.trainers) {
      Object.keys(updatedUser.trainers).map(async (key) => {
        try {
          updatedUser.trainers[key].image = await firebase.storage()
            .ref().child(key).getDownloadURL();
        } catch {
          updatedUser.trainers[key].image = Image.resolveAssetSource(profileImage).uri;
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
    if (updatedTrainers) {
      Object.keys(updatedTrainers).map(async (key) => {
        try {
          updatedTrainers[key].image = await firebase.storage().ref()
            .child(updatedTrainers[key].userKey).getDownloadURL();
        } catch {
          updatedTrainers[key].image = Image.resolveAssetSource(profileImage).uri;
        } finally {
          this.setState({ recentTrainers: updatedTrainers });
        }
      });
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
      <Text style={styles.subTitle} key={0}>Trainer Requests</Text>,
      requests,
    ]);
  }

  renderRecent = () => {
    if (!this.state.recentTrainers || !this.state.recentTrainers.length) {
      return null;
    }

    const recentTrainers = this.state.recentTrainers.map((trainer) => {
      let button;
      if (this.state.user.sentRequests && this.state.user.sentRequests[trainer.userKey]) {
        button = (
          <TouchableOpacity style={[styles.button, MasterStyles.shadow]} disabled>
            <Text style={styles.buttonText}>Pending</Text>
          </TouchableOpacity>
        );
      } else {
        button = (
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={() => this.sendRequest(trainer)}
          >
            <Text style={[styles.buttonText, { color: Colors.Green }]}>Add</Text>
          </TouchableOpacity>
        );
      }
      return (
        <View key={trainer.userKey} style={styles.rowContainer}>
          <Image
            style={styles.profileImage}
            source={{
              uri: trainer.image
                ? trainer.image
                : Image.resolveAssetSource(profileImage).uri,
            }}
          />
          <Text style={styles.name}>{trainer.name}</Text>
          <View style={styles.buttonRow}>
            {button}
          </View>
        </View>
      );
    });
    return ([
      <Text style={styles.subTitle} key={0}>Recent Trainers</Text>,
      recentTrainers,
    ]);
  }

  renderTrainers = () => {
    if (!this.state.user.trainers) {
      return null;
    }

    const trainers = Object.keys(this.state.user.trainers).map((key) => {
      const trainer = this.state.user.trainers[key];
      return (
        <View key={key} style={styles.rowContainer}>
          <Image
            style={styles.profileImage}
            source={{
              uri: trainer.image
                ? trainer.image
                : Image.resolveAssetSource(profileImage).uri,
            }}
          />
          <Text style={styles.name}>{trainer.name}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, MasterStyles.shadow]}
              onPress={() => {
                Actions.BookingPage({
                  clientKey: this.state.user.userKey,
                  trainerKey: trainer.userKey,
                  gymKey: trainer.gymKey,
                  bookedBy: Constants.clientType,
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
      <Text style={styles.subTitle} key={0}>Trainers</Text>,
      trainers,
    ]);
  }

  render() {
    if (!this.state.user || !this.state.recentTrainers || this.state.pressed) {
      return <LoadingWheel />;
    }

    return (
      <ScrollView
        style={{ width: '100%' }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        {this.renderRequests()}
        {this.renderRecent()}
        {this.renderTrainers()}
      </ScrollView>
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
  subTitle: {
    fontSize: 25,
    fontWeight: '600',
    textAlign: 'center',
    margin: 10,
  },
  mediumText: {
    fontSize: 25,
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
  buttonRow: {
    flexDirection: 'row',
    position: 'absolute',
    right: 10,
  },
  name: {
    fontSize: 18,
    margin: 10,
  },
  profileImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    margin: 5,
  },
});
