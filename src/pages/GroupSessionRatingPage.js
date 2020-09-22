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
  loadGroupSession, loadUser, rateGroupSession, dateToTime, chargeCard, sendMessage,
} from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class GroupSessionRatingPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    const userId = firebase.auth().currentUser.uid;
    const user = await loadUser(userId);
    const session = await loadGroupSession(this.props.session);
    if (user.type === Constants.clientType && session.clients[userId].rating) {
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
      if (this.state.session.trainerKey !== firebase.auth().currentUser.uid) {
        const total = (this.state.session.cost * 100).toFixed(0);
        const payout = (total - (total * Constants.groupSessionPercentage)).toFixed(0);
        await chargeCard(
          this.state.user.stripeId,
          this.state.session.trainerStripe,
          this.state.session.trainerKey,
          total,
          total - payout,
        );
        const message = `You were charged $ ${(total / 100).toFixed(2)} for your session with ${this.state.session.trainerName}. If this is not accurate please contact support.`;
        await sendMessage(this.state.user.phone, message);
      }
      await rateGroupSession(
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
        <Text style={styles.icon}>
          <FontAwesome name={starToRender} size={30} color={Colors.Secondary} />
        </Text>
      </TouchableOpacity>
    );
  }

  renderStars = (rating) => {
    let currentRating = rating;
    const star = [];
    let numStars = 0;
    while (currentRating >= 1) {
      numStars += 1;
      star.push(this.renderStar(numStars, false));
      currentRating -= 1;
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
    const displayDate = dateToTime(this.state.session.end);
    const total = (this.state.session.cost).toFixed(2);
    const payout = (total - total * Constants.groupSessionPercentage).toFixed(2);

    let cost = null;
    let stars = null;
    if (this.state.session.trainerKey === userId) {
      if (this.state.session.trainerType === Constants.independentType) {
        cost = (
          <View style={styles.textRow}>
            <Text style={styles.mediumText}>Earned:</Text>
            <Text style={styles.smallText}>
              $
              {' '}
              {(payout * this.state.session.clientCount).toFixed(2)}
            </Text>
          </View>
        );
      }
    } else {
      cost = (
        <View style={styles.textRow}>
          <Text style={styles.mediumText}>Cost:</Text>
          <Text style={styles.smallText}>
            $
            {total}
          </Text>
        </View>
      );
    }
    stars = this.renderStars(this.state.rating);
    return (
      <View style={[CommonStyles.flexStartContainer, { alignItems: 'flex-start' }]}>
        <Text style={styles.title}>Rate your session</Text>
        <View style={styles.infoContainer}>
          <View style={styles.textRow}>
            <Text style={styles.mediumText}>Ended:</Text>
            <Text style={styles.smallText}>{displayDate}</Text>
          </View>
          <View style={styles.textRow}>
            <Text style={styles.mediumText}>Total Time:</Text>
            <Text style={styles.smallText}>
              {this.state.session.duration}
              {' '}
              min
            </Text>
          </View>
          {cost}
        </View>
        <Text style={styles.subTitle}>Rating</Text>
        <View style={styles.starContainer}>
          {stars}
          <TouchableOpacity
            style={styles.button}
            onPress={this.rateSession}
          >
            <Text style={styles.buttonText}>Rate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

GroupSessionRatingPage.propTypes = {
  session: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  title: {
    margin: 15,
    marginTop: 40,
    fontSize: 25,
    fontWeight: '700',
  },
  subTitle: {
    margin: 15,
    fontSize: 20,
    fontWeight: '600',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    margin: 10,
  },
  mediumText: {
    fontSize: 20,
  },
  smallText: {
    fontSize: 18,
    color: Colors.DarkGray,
    marginLeft: 10,
  },
  starContainer: {
    width: '100%',
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  button: {
    ...CommonStyles.shadow,
    position: 'absolute',
    right: 10,
    borderRadius: 10,
    width: 100,
    height: 35,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    color: Colors.Primary,
    fontWeight: '600',
  },
  icon: {
    margin: 5,
  },
});
