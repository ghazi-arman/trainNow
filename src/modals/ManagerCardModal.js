import React, { Component } from 'react';
import {
  StyleSheet, Text, KeyboardAvoidingView, TouchableOpacity, Alert, Image, View,
} from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import PropTypes from 'prop-types';
import { STRIPE_KEY, FB_URL } from 'react-native-dotenv';
import { loadGym, loadUser } from '../components/Functions';
import TextField from '../components/TextField';

const stripe = require('stripe-client')(STRIPE_KEY);
const loading = require('../images/loading.gif');

export default class ManagerCardModal extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.gym) {
      try {
        const gym = await loadGym(this.props.gymKey);
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.setState({ gym, user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the card modal. Please try again later.');
        this.props.hide();
      }
    }
  }

  addCard = async () => {
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });

    const information = {
      card: {
        number: this.state.number.trim(),
        exp_month: this.state.expMonth,
        exp_year: this.state.expYear,
        cvc: this.state.cvc,
        name: this.state.name,
        currency: 'usd',
      },

    };

    let card;
    try {
      card = await stripe.createToken(information);
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error creating a token for the card. Please check your information and try again.');
      return;
    }

    const user = firebase.auth().currentUser;
    try {
      const idToken = await firebase.auth().currentUser.getIdToken(true);
      const res = await fetch(`${FB_URL}/stripe/addTrainerCard/`, {
        method: 'POST',
        headers: {
          Authorization: idToken,
        },
        body: JSON.stringify({
          token: card,
          stripeId: this.state.user.stripeId,
          user: user.uid,
        }),
      });
      const response = await res.json();
      if (response.body.message !== 'Success') {
        throw new Error('Stripe Error');
      }

      await firebase.database().ref('users').child(user.uid).update({
        cardAdded: true,
      });
      this.props.hide();
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error adding the card. Please check the info and make sure it is a debit card before trying again.');
    }
  }

  render() {
    if (!this.state.gym || !this.state.user || this.state.pressed) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <Text style={styles.title}>Add Card</Text>
        <TextField
          icon="user"
          placeholder="Name"
          onChange={(name) => this.setState({ name })}
          value={this.state.name}
        />
        <TextField
          icon="credit-card"
          placeholder="Card Number"
          keyboard="number-pad"
          onChange={(number) => this.setState({ number })}
          value={this.state.number}
        />
        <TextField
          icon="calendar"
          placeholder="Expiration Month (mm)"
          keyboard="number-pad"
          onChange={(expMonth) => this.setState({ expMonth })}
          value={this.state.expMonth}
        />
        <TextField
          icon="calendar"
          placeholder="Expiration Year (yy)"
          keyboard="number-pad"
          onChange={(expYear) => this.setState({ expYear })}
          value={this.state.expYear}
        />
        <TextField
          icon="lock"
          placeholder="CVC Code"
          onChange={(cvc) => this.setState({ cvc })}
          value={this.state.cvc}
        />
        <TouchableOpacity style={styles.submitButton} onPressIn={() => this.addCard()}>
          <Text style={styles.buttonText}> Add Card </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }
}

ManagerCardModal.propTypes = {
  hide: PropTypes.func.isRequired,
  gymKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 0.85,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 20,
  },
  submitButton: {
    backgroundColor: '#0097A7',
    paddingVertical: 15,
    marginTop: 10,
    borderRadius: 5,
    width: '80%',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: '#FAFAFA',
    fontWeight: '700',
  },
  title: {
    color: '#0097A7',
    fontSize: 30,
    marginTop: 5,
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
