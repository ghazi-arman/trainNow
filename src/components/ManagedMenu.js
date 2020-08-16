import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Image,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import Colors from './Colors';
import Constants from './Constants';
import { loadUser, renderStars } from './Functions';
import LoadingWheel from './LoadingWheel';
import defaultProfilePic from '../images/profile.png';

export default class ManagedMenu extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const userId = firebase.auth().currentUser.uid;
    const user = await loadUser(userId);
    try {
      const image = await firebase.storage().ref().child(userId).getDownloadURL();
      this.setState({ user, image });
    } catch (error) {
      this.setState({ user, image: Image.resolveAssetSource(defaultProfilePic).uri });
    }
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

    return (
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Image style={styles.profilePicture} source={{ uri: this.state.image }} />
          <Text style={styles.name}>{this.state.user.name}</Text>
          <Text style={styles.stars}>{renderStars(this.state.user.rating)}</Text>
        </View>
        <TouchableOpacity style={styles.menuRow} onPress={this.props.toggleMenu}>
          <FontAwesome style={styles.icon} name="compass" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Actions.SettingsPage({ userType: Constants.trainerType })}
        >
          <FontAwesome style={styles.icon} name="gear" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={Actions.CalendarPage}>
          <FontAwesome style={styles.icon} name="calendar" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={Actions.ClientsPage}>
          <FontAwesome style={styles.icon} name="users" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>Clients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={() => Linking.openURL(Constants.faqUrl)}>
          <FontAwesome style={styles.icon} name="book" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>FAQ</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={this.logout}>
          <FontAwesome style={styles.icon} name="power-off" color={Colors.Primary} size={27} />
          <Text style={styles.menuLink}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

ManagedMenu.propTypes = {
  toggleMenu: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: Colors.LightGray,
  },
  nameContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.LightGray,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    paddingBottom: 20,
    paddingTop: 40,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 10,
    marginLeft: 5,
  },
  profilePicture: {
    height: 75,
    width: 75,
    borderRadius: 37,
  },
  name: {
    color: Colors.Black,
    fontWeight: '800',
    fontSize: 25,
    paddingVertical: 10,
  },
  menuLink: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.Black,
    marginLeft: 10,
  },
  icon: {
    width: 35,
  },
  stars: {
    color: Colors.Primary,
    fontSize: 15,
  },
});
