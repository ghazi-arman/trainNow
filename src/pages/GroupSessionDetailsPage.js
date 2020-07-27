import React, { Component } from 'react';
import {
  View, Image, StyleSheet, Text, TouchableOpacity, Dimensions, ScrollView, Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import {
  loadGroupSession, dateToString, joinGroupSession, loadUser,
} from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import Colors from '../components/Colors';
import BackButton from '../components/BackButton';
import profileImage from '../images/profile.png';

export default class GroupSessionDetailsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    const session = await loadGroupSession(this.props.sessionKey);
    const user = await loadUser(firebase.auth().currentUser.uid);
    let image;
    try {
      image = await firebase.storage().ref().child(session.trainerKey).getDownloadURL();
    } catch {
      image = Image.resolveAssetSource(profileImage).uri;
    } finally {
      this.setState({ session, image, user });
    }
  }

  joinGroupSession = async () => {
    try {
      const userId = firebase.auth().currentUser.uid;
      if (this.state.session.clientCount >= this.state.session.capacity) {
        Alert.alert('This session is already full.');
        return;
      }

      if (this.state.session.clients && this.state.session.clients[userId]) {
        Alert.alert('You have already joined this session.');
        return;
      }

      if (!this.state.user.cardAdded) {
        Alert.alert('You must have a card entered before you can join a group session.');
        return;
      }

      if (userId === this.state.session.trainerKey) {
        Alert.alert('You cannot join you own group session.');
        return;
      }

      if (this.state.session.started) {
        Alert.alert('You cannot join a session after it has started.');
        return;
      }

      await joinGroupSession(this.state.session, this.state.user, userId);
      const session = await loadGroupSession(this.props.sessionKey);
      this.setState({ session });
      Alert.alert('You have successfully joined the session. You can leave this session before it starts on the calendar page.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error when trying to join the group session. Please try again later');
    }
  }

  render() {
    if (!this.state.session || !this.state.image || !this.state.user) {
      return <LoadingWheel />;
    }

    return (
      <ScrollView contentContainerStyle={[MasterStyles.flexStartContainer, styles.container]}>
        <BackButton />
        <Image style={styles.profileImage} source={{ uri: this.state.image }} />
        <Text style={styles.name}>{this.state.session.name}</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoHeader}>
              {this.state.session.clientCount}
              {' '}
              /
              {' '}
              {this.state.session.capacity}
            </Text>
            <Text style={styles.infoText}>Joined</Text>
          </View>
          <View style={[styles.infoBox, styles.infoBoxBorder]}>
            <Text style={styles.infoHeader}>
              $
              {this.state.session.cost}
            </Text>
            <Text style={styles.infoText}>Price</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoHeader}>
              {this.state.session.duration}
              {' '}
              min
            </Text>
            <Text style={styles.infoText}>Duration</Text>
          </View>
        </View>
        <View style={styles.aboutContainer}>
          <Text style={styles.infoHeader}>About</Text>
          <Text style={styles.bioText}>{this.state.session.bio}</Text>
          <View style={styles.aboutBox}>
            <FontAwesome style={styles.icon} name="user" color={Colors.Primary} size={25} />
            <Text style={styles.aboutHeader}>Trainer: </Text>
            <Text style={styles.aboutText}>{this.state.session.trainerName}</Text>
          </View>
          <View style={styles.aboutBox}>
            <FontAwesome style={styles.icon} name="building" color={Colors.Primary} size={25} />
            <Text style={styles.aboutHeader}>Gym: </Text>
            <Text style={styles.aboutText}>{this.state.session.gymName}</Text>
          </View>
          <View style={styles.aboutBox}>
            <FontAwesome style={styles.icon} name="calendar" color={Colors.Primary} size={25} />
            <Text style={styles.aboutHeader}>Time: </Text>
            <Text style={styles.aboutText}>{dateToString(this.state.session.start)}</Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={this.joinGroupSession}
          >
            <Text style={styles.buttonText}>Join Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, MasterStyles.shadow]}
            onPress={() => Actions.TrainerPage({
              trainerKey: this.state.session.trainerKey,
              gymKey: this.state.session.gymKey,
            })}
          >
            <Text style={styles.buttonText}>View Trainer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
}

GroupSessionDetailsPage.propTypes = {
  sessionKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: null,
    paddingBottom: 50,
  },
  profileImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
    marginTop: Dimensions.get('window').height / 15,
  },
  name: {
    marginVertical: 20,
    fontWeight: '600',
    fontSize: 25,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '20%',
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    paddingVertical: 20,
  },
  infoBox: {
    width: '33%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.Gray,
  },
  infoHeader: {
    fontWeight: '600',
    fontSize: 22,
  },
  infoText: {
    fontSize: 17,
    color: Colors.DarkGray,
  },
  aboutContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 20,
  },
  aboutBox: {
    width: '60%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bioText: {
    fontSize: 15,
    marginVertical: 10,
  },
  aboutHeader: {
    fontSize: 15,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.DarkGray,
  },
  icon: {
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '40%',
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.LightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingVertical: 15,
    elevation: 3,
  },
  buttonText: {
    color: Colors.Primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
