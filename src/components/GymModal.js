import React, { Component } from 'react';
import {
  Image, StyleSheet, Text, View, ScrollView, TouchableWithoutFeedback,
} from 'react-native';
import PropTypes from 'prop-types';
import geolib from 'geolib';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import Colors from './Colors';
import Constants from './Constants';
import LoadingWheel from './LoadingWheel';
import { sortGymsByLocation } from './Functions';
import MasterStyles from './MasterStyles';
import gymImage from '../images/gym.png';
import profileImage from '../images/profile.png';

export default class GymModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 'trainers',
      selectedGym: this.props.selectedGym,
    };
    this.selectGym = this.selectGym.bind(this);
  }

  static getDerivedStateFromProps = (props) => ({ selectedGym: props.selectedGym })

  renderGyms = () => {
    const sortedGyms = sortGymsByLocation(this.props.gyms, this.props.userRegion);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Find a gym near you</Text>
        <ScrollView contentContainerStyle={MasterStyles.flexStartContainer}>
          {sortedGyms.map((gym) => (
            <View style={styles.gymContainer} key={gym.key}>
              <Image style={styles.gymImage} source={gymImage} />
              <TouchableWithoutFeedback onPress={() => this.selectGym(gym)}>
                <View style={styles.nameContainer}>
                  <Text style={styles.gymName}>{gym.name}</Text>
                  <Text style={styles.distance}>
                    {(geolib.getDistance(
                      gym.location,
                      this.props.userRegion,
                    ) * Constants.metersToMilesMultiplier).toFixed(2)}
                    {' '}
                    miles away
                  </Text>
                </View>
              </TouchableWithoutFeedback>
              <View style={styles.linkContainer}>
                <Text style={styles.link} onPress={() => this.selectGym(gym)}>Details</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  renderTrainers = () => {
    if (!this.state.selectedGym.trainers) {
      return null;
    }
    return Object.keys(this.state.selectedGym.trainers).map((key) => {
      const trainer = this.state.selectedGym.trainers[key];
      return (
        <View style={styles.gymContainer} key={key}>
          <Image
            style={styles.gymImage}
            source={{ uri: trainer.uri ? trainer.uri : Image.resolveAssetSource(profileImage).uri }}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.gymName}>{trainer.name}</Text>
            <Text style={styles.distance}>
              $
              {trainer.rate}
              /hr
            </Text>
          </View>
          <View style={styles.linkContainer}>
            <Text
              style={styles.link}
              onPress={() => Actions.TrainerPage({
                trainerKey: key,
                gymKey: this.state.selectedGym.key,
              })}
            >
              Details
            </Text>
          </View>
        </View>
      );
    });
  }

  renderSessions = () => {
    if (!this.state.selectedGym.groupSessions) {
      return null;
    }
    return Object.keys(this.state.selectedGym.groupSessions).map((key) => {
      const session = this.state.selectedGym.groupSessions[key];
      return (
        <View style={styles.gymContainer} key={key}>
          <Image
            style={styles.gymImage}
            source={{ uri: this.state.selectedGym.trainers[session.trainerKey].uri }}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.gymName}>{session.name}</Text>
            <Text style={styles.distance}>
              $
              {session.cost}
              {' '}
              -
              {session.duration}
              {' '}
              min
            </Text>
          </View>
          <View style={styles.linkContainer}>
            <Text
              style={styles.link}
              onPress={() => Actions.GroupSessionDetailsPage({ sessionKey: key })}
            >
              Details
            </Text>
          </View>
        </View>
      );
    });
  }

  renderTrainersAndSessions = () => (
    <View style={[styles.container, { alignItems: 'center' }]}>
      <View style={styles.navigationBar}>
        <TouchableWithoutFeedback onPress={() => this.setState({ selectedTab: 'trainers' })}>
          <View
            style={[
              styles.navigationTab,
              styles.leftNavigationTab,
              (this.state.selectedTab === 'trainers' ? styles.activeTab : null),
            ]}
          >
            <Text style={styles.gymName}>Trainers</Text>
          </View>
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={() => this.setState({ selectedTab: 'sessions' })}>
          <View
            style={[
              styles.navigationTab,
              (this.state.selectedTab === 'sessions' ? styles.activeTab : null),
            ]}
          >
            <Text style={styles.gymName}>Sessions</Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
      <ScrollView contentContainerStyle={[MasterStyles.flexStartContainer, { width: '90%' }]}>
        {this.state.selectedTab === 'trainers' ? this.renderTrainers() : this.renderSessions()}
      </ScrollView>
    </View>
  )

  selectGym = (gym) => {
    const selectedGym = gym;
    if (selectedGym.trainers) {
      Object.keys(selectedGym.trainers).map(async (key) => {
        try {
          const url = await firebase.storage().ref().child(key).getDownloadURL();
          selectedGym.trainers[key].uri = url;
          this.setState({ selectedGym });
        } catch (error) {
          selectedGym.trainers[key].uri = Image.resolveAssetSource(profileImage).uri;
          this.setState({ selectedGym });
        }
      });
    }
    this.setState({ selectedGym });
    this.props.selectGym(gym);
  }

  render() {
    if (!this.props.gyms) {
      return <LoadingWheel />;
    }
    return (
      <View style={MasterStyles.flexStartContainer}>
        {!this.state.selectedGym ? this.renderGyms() : this.renderTrainersAndSessions()}
      </View>
    );
  }
}

GymModal.propTypes = {
  gyms: PropTypes.array.isRequired,
  userRegion: PropTypes.object.isRequired,
  selectGym: PropTypes.func.isRequired,
  selectedGym: PropTypes.object,
};

GymModal.defaultProps = {
  selectedGym: undefined,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  navigationBar: {
    width: '90%',
    height: 30,
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderColor: Colors.LightGray,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  navigationTab: {
    width: '50%',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  leftNavigationTab: {
    borderRightWidth: 1,
    borderColor: Colors.LightGray,
  },
  activeTab: {
    backgroundColor: Colors.LightGray,
  },
  gymContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  nameContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '90%',
  },
  linkContainer: {
    position: 'absolute',
    right: 0,
  },
  gymName: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Black,
  },
  distance: {
    fontWeight: '400',
    fontSize: 12,
    color: Colors.DarkGray,
  },
  link: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Primary,
  },
  title: {
    fontWeight: '600',
    fontSize: 20,
    textAlign: 'left',
  },
  gymImage: {
    height: 40,
    width: 40,
    borderRadius: 20,
    marginRight: 5,
  },
});
