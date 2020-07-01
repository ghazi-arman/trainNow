import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Linking,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import COLORS from './Colors';
import Constants from './Constants';
import { loadUser, renderStars } from './Functions';
import LoadingWheel from './LoadingWheel';

export default class ManagedSideMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const user = await loadUser(firebase.auth().currentUser.uid);
    this.setState({ user });
  }

  logout = () => {
    Alert.alert(
      'Are you sure you wish to sign out?',
      '',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: () => {
            firebase.auth().signOut().then(() => {
              Actions.reset('LoginPage');
            }, (error) => {
              Alert.alert('Sign Out Error', error);
            });
          },
        },
      ],
    );
  }

  render() {
    if (!this.state.user) {
      return <LoadingWheel />;
    }
    let clientLink;
    let active;
    if (this.state.user.type === Constants.trainerType) {
      clientLink = (
        <TouchableOpacity onPress={() => Actions.ClientPage()}>
          <Text style={styles.icon}>
            <FontAwesome name="users" size={30} />
            {' '}
            <Text style={styles.menuLink}>Clients</Text>
          </Text>
        </TouchableOpacity>
      );
      if (this.state.user.active) {
        active = (<Text style={{ fontSize: 20, color: COLORS.WHITE }}>Active</Text>);
      } else {
        active = (<Text style={{ fontSize: 20, color: COLORS.RED }}>Away</Text>);
      }
    } else {
      clientLink = (
        <TouchableOpacity onPress={() => Actions.TrainerPage()}>
          <Text style={styles.icon}>
            <FontAwesome name="users" size={30} />
            {' '}
            <Text style={styles.menuLink}>Trainers</Text>
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={{ fontSize: 25, color: COLORS.WHITE }}>{this.state.user.name}</Text>
          <Text style={styles.stars}>{renderStars(this.state.user.rating)}</Text>
          {active}
        </View>
        <TouchableOpacity onPress={() => Actions.MapPage()}>
          <Text style={styles.icon}>
            <FontAwesome name="compass" size={30} />
            {' '}
            <Text style={styles.menuLink}>Map</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text
            style={styles.icon}
            onPress={() => Actions.SettingsPage({ userType: Constants.trainerType })}
          >
            <FontAwesome name="gear" size={30} />
            {' '}
            <Text style={styles.menuLink}>Settings</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Actions.CalendarPage()}>
          <Text style={styles.icon}>
            <FontAwesome name="calendar" size={30} />
            {' '}
            <Text style={styles.menuLink}>Calendar</Text>
          </Text>
        </TouchableOpacity>
        {clientLink}
        <TouchableOpacity onPress={() => Linking.openURL(Constants.faqUrl)}>
          <Text style={styles.icon}>
            <FontAwesome name="book" size={30} />
            {' '}
            <Text style={styles.menuLink}>FAQ</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={this.logout}>
          <Text style={styles.icon}>
            <FontAwesome name="power-off" size={30} />
            {' '}
            <Text style={styles.menuLink}>Sign Out</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WHITE,
  },
  nameContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY,
    paddingBottom: 20,
    paddingTop: 40,
  },
  icon: {
    fontSize: 30,
    color: COLORS.PRIMARY,
    marginLeft: 10,
    padding: 10,
  },
  menuLink: {
    fontSize: 30,
    color: COLORS.PRIMARY,
  },
  stars: {
    color: COLORS.WHITE,
    fontSize: 15,
  },
});
