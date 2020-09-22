import React, { Component } from 'react';
import {
  View, Image, StyleSheet, Text, TouchableOpacity, Dimensions, ScrollView, Alert,
} from 'react-native';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import {
  sendMessage, loadUser, chargeCard, createSubscription, cancelSubscription,
} from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';
import profileImage from '../images/profile.png';
import Colors from '../components/Colors';
import BackButton from '../components/BackButton';
import Constants from '../components/Constants';

export default class WorkoutPlanPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    const trainer = await loadUser(this.props.trainerKey);
    const plan = trainer.workoutPlans[this.props.planKey];
    const user = await loadUser(firebase.auth().currentUser.uid);
    let image;
    try {
      image = await firebase.storage().ref().child(this.props.trainerKey).getDownloadURL();
    } catch {
      image = Image.resolveAssetSource(profileImage).uri;
    } finally {
      this.setState({
        trainer, image, user, plan,
      });
    }
  }

  purchasePlan = async () => {
    if (!this.state.user.cardAdded) {
      Alert.alert('You must enter your payment information before you can purchase this plan.');
      return;
    }

    Alert.alert(
      'Workout Plan',
      `Are you sure you want to purchase the ${this.state.plan.name} plan for $${this.state.plan.cost}${this.state.plan.monthly ? ' per month' : ''}.`,
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            let response;
            const user = await loadUser(firebase.auth().currentUser.uid);
            try {
              if (this.state.submitted) {
                return;
              }
              if (user.workoutPlans && user.workoutPlans[this.props.planKey]) {
                Alert.alert('You have already purchased this plan.');
                return;
              }
              this.setState({ submitted: true });
              await firebase.database().ref(`/users/${firebase.auth().currentUser.uid}/workoutPlans/${this.props.planKey}`).set(this.state.plan);
              if (!this.state.plan.monthly) {
                const total = (this.state.plan.cost * 100).toFixed(0);
                const payout = (total - (total * Constants.groupSessionPercentage)).toFixed(0);
                await chargeCard(
                  this.state.user.stripeId,
                  this.state.trainer.stripeId,
                  this.state.trainer.userKey,
                  total,
                  total - payout,
                );
              } else {
                const total = (this.state.plan.cost * 100).toFixed(0);
                response = await createSubscription(
                  this.props.planKey,
                  this.state.user.stripeId,
                  this.state.trainer.stripeId,
                  total,
                  17.5,
                  'month',
                );
                await firebase.database().ref(`/users/${firebase.auth().currentUser.uid}/workoutPlans/${this.props.planKey}`).update({ subscriptionId: response.body.subscription.id });
              }
              await firebase.database().ref(`/users/${this.props.trainerKey}/workoutPlans/${this.props.planKey}/clients/${firebase.auth().currentUser.uid}`).set({
                name: this.state.user.name,
                phone: this.state.user.phone,
                trainerKey: this.state.trainer.userKey,
                trainerPhone: this.state.trainer.phone,
                subscriptionId: this.state.plan.monthly ? response.body.subscription.id : null,
              });
              sendMessage(this.state.trainer.phone, `${this.state.user.name} has purchased your ${this.state.plan.name} workout plan. Please contact him at ${this.state.user.phone} for details on how to send him the plan.`);
              Alert.alert(`Workout plan purchased. ${this.state.trainer.name} should contact you shortly.`);
              return;
            } catch (error) {
              Alert.alert('There was an error purchasing the workout plan. Please try again later.');
              await firebase.database().ref(`/users/${firebase.auth().currentUser.uid}/workoutPlans/${this.props.planKey}`).remove();
              if (this.state.plan.monthly && response.body.subscription.id) {
                await cancelSubscription(this.state.user.stripeId, response.body.subscription.id);
              }
              await firebase.database().ref(`/users/${this.props.trainerKey}/workoutPlans/${this.props.planKey}/clients/${firebase.auth().currentUser.uid}`).remove();
              this.bugsnagClient.notify(error);
            } finally {
              this.setState({ submitted: false });
            }
          },
        },
      ],
    );
  }

  render() {
    if (!this.state.trainer || !this.state.image || this.state.submitted) {
      return <LoadingWheel />;
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton style={styles.backButton} />
        <Image style={styles.profileImage} source={{ uri: this.state.image }} />
        <Text style={styles.name}>
          {this.state.plan.name}
        </Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{this.state.plan.exercises}</Text>
            <Text style={styles.infoText}>Exercises</Text>
          </View>
          <View style={[styles.infoBox, styles.infoBoxBorder]}>
            <Text style={styles.infoTitle}>
              $
              {this.state.plan.cost}
              {this.state.plan.monthly ? '/mth' : null}
            </Text>
            <Text style={styles.infoText}>Cost</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              {this.state.plan.duration}
              {' '}
              weeks
            </Text>
            <Text style={styles.infoText}>Length</Text>
          </View>
        </View>
        <View style={styles.aboutContainer}>
          <Text style={styles.infoTitle}>About</Text>
          <Text style={styles.bioText}>{this.state.plan.description}</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={this.purchasePlan}>
            <Text style={styles.buttonText}>Purchase Plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
}

WorkoutPlanPage.propTypes = {
  trainerKey: PropTypes.string.isRequired,
  planKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.flexStartContainer,
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
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
  infoTitle: {
    fontWeight: '600',
    fontSize: 20,
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
  aboutTitle: {
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
    ...CommonStyles.shadow,
    width: '85%',
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.LightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingVertical: 15,
  },
  buttonText: {
    color: Colors.Primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
