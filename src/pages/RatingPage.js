import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
} from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import Colors from '../components/Colors';
import {
  loadSession, loadUser, rateSession, dateToString, chargeCard,
} from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class RatingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    const userId = firebase.auth().currentUser.uid;
    const user = await loadUser(userId);
    const session = await loadSession(this.props.session);
    const ratingField = `${user.type}Rating`;
    if (session[user.type] === userId && session[ratingField]) {
      Actions.reset('MapPage');
      return;
    }
    this.setState({ session, user });
  }

  rateSession = async () => {
    if (this.state.pressed) {
      return;
    }
    if (!this.state.rating) {
      Alert.alert('Enter a rating!');
      return;
    }
    this.setState({ pressed: true });
    try {
      if (this.state.user.type === Constants.clientType) {
        const duration = new Date(this.state.session.end) - new Date(this.state.session.start);
        const minutes = Math.floor((duration / 1000) / 60);
        const total = (minutes * (this.state.session.rate / 60) * 100).toFixed(0);
        let percentage = this.state.session.regular
          ? Constants.regularClientPercentage
          : Constants.newClientPercentage;
        if (this.state.session.type === Constants.groupSessionType) {
          percentage = Constants.groupSessionPercentage;
        }
        const payout = (total - total * percentage).toFixed(0);
        if (payout !== '0') {
          await chargeCard(
            this.state.user.stripeId,
            this.state.session.trainerStripe,
            total,
            total - payout,
            this.state.session,
            this.state.user.phone,
          );
        }
      }

      await rateSession(
        this.state.session.key,
        parseInt(this.state.rating, 10),
        this.state.user.type,
      );
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error rating the session. Please try again later');
    } finally {
      Actions.reset('MapPage');
    }
  }

  setRating = (key) => this.setState({ rating: key });

  renderStar = (number, outline) => {
    const starToRender = outline ? 'star-o' : 'star';
    return (
      <TouchableOpacity key={number} onPress={() => this.setRating(number)}>
        <Text style={styles.icon}><FontAwesome name={starToRender} size={35} /></Text>
      </TouchableOpacity>
    );
  }

  renderStars = (rating) => {
    let ratingRemaining = rating;
    const star = [];
    let numStars = 0;
    while (ratingRemaining >= 1) {
      numStars += 1;
      star.push(this.renderStar(numStars, false));
      ratingRemaining -= 1;
    }
    while (numStars < 5) {
      numStars += 1;
      star.push(this.renderStar(numStars, true));
    }
    return star;
  }

  render() {
    if (!this.state.session || !this.state.user || this.state.pressed) {
      return <LoadingWheel />;
    }
    const userId = firebase.auth().currentUser.uid;
    const displayDate = dateToString(this.state.session.end);
    const duration = new Date(this.state.session.end) - new Date(this.state.session.start);
    const minutes = Math.floor((duration / 1000) / 60);
    const total = (minutes * (this.state.session.rate / 60)).toFixed(2);
    let percentage = this.state.session.regular
      ? Constants.regularClientPercentage
      : Constants.newClientPercentage;
    if (this.state.session.type === Constants.groupSessionType) {
      percentage = Constants.groupSessionPercentage;
    }
    const payout = (total - total * percentage).toFixed(2);

    let cost = null;
    if (this.state.session.trainerKey === userId) {
      if (this.state.session.trainerType === Constants.independentType) {
        cost = (
          <Text style={styles.bookDetails}>
            Total Earned: $
            {payout}
          </Text>
        );
      }
    } else {
      cost = (
        <Text style={styles.bookDetails}>
          Total Cost: $
          {total}
        </Text>
      );
    }
    const stars = this.renderStars(this.state.rating);
    return (
      <View style={MasterStyles.spacedContainer}>
        <View style={MasterStyles.centeredContainer}>
          <View style={styles.infoContainer}>
            <Text style={styles.header}>Rate Session!</Text>
            <Text style={styles.bookDetails}>
              Ended:
              {displayDate}
            </Text>
            <Text style={styles.bookDetails}>
              Total Time:
              {' '}
              {minutes}
              {' '}
              min
            </Text>
            {cost}
            <View style={styles.starContainer}>
              {stars}
            </View>
          </View>
          <View style={styles.buttonContain}>
            <TouchableOpacity style={styles.buttonContainer} onPressIn={this.rateSession}>
              <Text style={styles.buttonText}>Rate Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

RatingPage.propTypes = {
  session: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  bookDetails: {
    fontSize: 25,
    fontWeight: '500',
    color: Colors.Primary,
  },
  header: {
    fontSize: 35,
    fontWeight: '700',
    color: Colors.Primary,
  },
  buttonContain: {
    width: '50%',
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  infoContainer: {
    height: '65%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: '100%',
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.LightGray,
    fontWeight: '700',
  },
  icon: {
    color: Colors.Secondary,
    fontSize: 35,
  },
});
