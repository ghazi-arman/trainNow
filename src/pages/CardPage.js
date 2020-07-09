import React, { Component } from 'react';
import {
  StyleSheet, Text, KeyboardAvoidingView, TouchableOpacity, Alert, View,
} from 'react-native';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { STRIPE_KEY, FB_URL } from 'react-native-dotenv';
import { Actions } from 'react-native-router-flux';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

const stripe = require('stripe-client')(STRIPE_KEY);

export default class CardPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        this.setState({ user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the card page.');
        Actions.pop();
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
        number: this.state.number,
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
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    if (!this.state.user.stripeId) {
      try {
        const res = await fetch(`${FB_URL}/stripe/createCustomer/`, {
          method: 'POST',
          headers: {
            Authorization: idToken,
          },
          body: JSON.stringify({
            token: card,
            uid: user.uid,
            email: user.email,
          }),
        });
        const response = await res.json();
        if (response.body.message !== 'Success') {
          throw new Error('Stripe Error');
        }

        await firebase.database().ref('users').child(user.uid).update({
          stripeId: response.body.customer.id,
          cardAdded: true,
        });
        Actions.PaymentPage();
      } catch (error) {
        this.setState({ pressed: false });
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error adding the card. Please try again.');
      }
    } else if (
      this.state.user.type === Constants.trainerType
      || this.state.user.type === Constants.managerType
    ) {
      try {
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
        if (this.state.user.type === Constants.managerType) {
          Actions.ManagerPage({ gymKey: this.state.user.gym });
          return;
        }
        Actions.PaymentPage();
      } catch (error) {
        this.setState({ pressed: false });
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error adding the card. Please check the info and make sure it is a debit card before trying again.');
      }
    } else {
      try {
        const res = await fetch(`${FB_URL}/stripe/addCard/`, {
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
        Actions.PaymentPage();
      } catch (error) {
        this.setState({ pressed: false });
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error adding the card. Please try again.');
      }
    }
  }

  render() {
    if (!this.state.user || this.state.pressed) {
      return <LoadingWheel />;
    }
    return (
      <View style={MasterStyles.spacedContainer}>
        <View style={styles.nameContainer}>
          <BackButton />
          <Text style={styles.title}>Add Card</Text>
        </View>
        <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
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
            keyboard="number-pad"
            onChange={(cvc) => this.setState({ cvc })}
            value={this.state.cvc}
          />
          <TouchableOpacity style={styles.submitButton} onPressIn={() => this.addCard()}>
            <Text style={styles.buttonText}>
              Add Card
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 7,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.White,
    padding: 20,
  },
  submitButton: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: '80%',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: Colors.White,
    fontWeight: '700',
  },
  title: {
    color: Colors.Primary,
    fontSize: 34,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
});
