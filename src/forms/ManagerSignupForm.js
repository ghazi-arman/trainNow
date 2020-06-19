import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Linking, Image,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { STRIPE_KEY, FB_URL } from 'react-native-dotenv';
import COLORS from '../components/Colors';
import Constants from '../components/Constants';
import TextField from '../components/TextField';

const stripe = require('stripe-client')(STRIPE_KEY);
const loading = require('../images/loading.gif');

export default class ManagerSignupForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 1,
    };
    this.bugsnagClient = bugsnag();
  }

  onSignUpPress = async () => {
    // Input validation
    if (this.state.pressed) {
      return;
    }
    if (!this.state.address) {
      Alert.alert('Please enter an address!');
      return;
    }
    if (!this.state.city.length) {
      Alert.alert('Please enter a city!');
      return;
    }
    if (this.state.zip.length !== 5) {
      Alert.alert('Please enter a valid 5 digit zip code!');
      return;
    }
    if (this.state.state.trim().length !== 2) {
      Alert.alert('Please enter a valid state Abbreviation!');
      return;
    }

    this.setState({ pressed: true });
    const firstName = this.state.name.split(' ')[0];
    const lastName = this.state.name.split(' ')[1];
    const month = this.state.birthDay.split('/')[0];
    const day = this.state.birthDay.split('/')[1];
    const year = this.state.birthDay.split('/')[2];
    const taxId = {
      pii: {
        tax_id: this.state.taxId,
      },
    };
    const ssn = {
      pii: {
        personal_id_number: this.state.ssn,
      },
    };
    let taxToken;
    let ssnToken;

    try {
      // Create stripe tokens from social security and tax id
      taxToken = await stripe.createToken(taxId);
      ssnToken = await stripe.createToken(ssn);
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('Invalid tax id or social security. Please verify information.');
      return;
    }

    try {
      // Call firebase cloud function to create stripe account for manager
      const res = await fetch(`${FB_URL}/stripe/createManager/`, {
        method: 'POST',
        body: JSON.stringify({
          line1: this.state.address,
          city: this.state.city,
          state: this.state.state,
          zip: this.state.zip,
          email: this.state.email,
          phone: this.state.phone,
          firstName,
          lastName,
          ssnToken: ssnToken.id,
          taxToken: taxToken.id,
          company: this.state.companyName,
          day,
          month,
          year,
        }),
      });

      // Check if stripe account was created successfully
      const response = await res.json();
      const data = JSON.parse(response.body);

      if (data.message !== 'Success') {
        this.setState({ pressed: false });
        this.bugsnagClient.leaveBreadcrumb(data);
        Alert.alert('There was an error creating your stripe Account. Please review your information and try again!');
        return;
      }
      try {
        // Create firebase account for user
        const user = await firebase.auth().createUserWithEmailAndPassword(
          this.state.email,
          this.state.password,
        );
        firebase.database().ref('users').child(user.user.uid).set({
          type: Constants.managerType,
          name: this.state.name,
          gym: this.state.gymKey,
          phone: this.state.phone,
          stripeId: data.trainer.account,
          pending: true,
          cardAdded: false,
        });

        await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
        Alert.alert('You must enter a debit card for payouts before clients can book a sessions at your gym!');
        Actions.reset('LoginPage');
        return;
      } catch (error) {
        throw new Error(error);
      }
    } catch (error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error creating your Account. Please try again!');
    }
  }

  goBack = () => {
    if (this.state.page === 2) {
      this.setState({ page: 1 });
    } else if (this.state.page === 3) {
      this.setState({ page: 2 });
    }
  }

  goNext = async () => {
    if (this.state.page === 1) {
      if (!this.state.name || !this.state.name.trim().length) {
        Alert.alert('Please enter a name!');
        return;
      }
      if (!this.state.email || !this.state.email.trim().length) {
        Alert.alert('Please enter an email!');
        return;
      }
      if (!this.state.password || this.state.password.trim().length < 6) {
        Alert.alert('Please enter a password at least 6 characters long!');
        return;
      }
      if (!this.state.confirmPass || this.state.password !== this.state.confirmPass) {
        Alert.alert('Passwords must match!');
        return;
      }
      if (!this.state.phone || this.state.phone.trim().length < 10) {
        Alert.alert('Please enter a valid phone number');
      }

      try {
        const emailCheck = await firebase.auth().fetchSignInMethodsForEmail(this.state.email);
        if (emailCheck.length) {
          Alert.alert('That email is already in use');
          return;
        }
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('Please enter a valid email');
        return;
      }
      this.setState({ page: 2 });
    } else if (this.state.page === 2) {
      if (!this.state.companyName.length) {
        Alert.alert('Please enter a company name');
        return;
      }
      if (!this.state.gymKey.length) {
        Alert.alert('Please enter a gym Key!');
        return;
      }
      if (!this.state.ssn.length) {
        Alert.alert('Please enter your Social Security Number!');
        return;
      }
      if (!this.state.taxId.length) {
        Alert.alert('Please enter your Company Tax ID!');
        return;
      }
      if (!this.state.birthDay.length) {
        Alert.alert('Please fill out your birthday!');
        return;
      }

      this.setState({ page: 3 });
    }
  }

  render() {
    if (this.state.pressed) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }

    let page1;
    let page2;
    let page3;
    let page4;
    let submitButton;
    let agreement;
    let prevButton;
    let nextButton;

    prevButton = (
      <TouchableOpacity style={styles.buttonContainer} onPressIn={this.goBack}>
        <Text style={styles.buttonText}>Previous</Text>
      </TouchableOpacity>
    );

    nextButton = (
      <TouchableOpacity style={styles.buttonContainer} onPressIn={this.goNext}>
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    );

    if (this.state.page === 1) {
      prevButton = null;
      page1 = (
        <View style={styles.container}>
          <TextField
            icon="user"
            placeholder="Name (First and Last Only)"
            onChange={(name) => this.setState({ name })}
            value={this.state.name}
          />
          <TextField
            icon="envelope"
            placeholder="Email"
            keyboard="email-address"
            onChange={(email) => this.setState({ email })}
            value={this.state.email}
          />
          <TextField
            icon="lock"
            placeholder="Password"
            secure
            onChange={(password) => this.setState({ password })}
            value={this.state.password}
          />
          <TextField
            icon="lock"
            placeholder="Confirm Password"
            secure
            onChange={(confirmPass) => this.setState({ confirmPass })}
            value={this.state.confirmPass}
          />
          <TextField
            icon="phone"
            placeholder="Phone Number"
            keyboard="number-pad"
            onChange={(phone) => this.setState({ phone })}
            value={this.state.phone}
          />
        </View>
      );
    } else if (this.state.page === 2) {
      page2 = (
        <View style={styles.container}>
          <TextField
            icon="building"
            placeholder="Company Name"
            onChange={(companyName) => this.setState({ companyName })}
            value={this.state.companyName}
          />
          <TextField
            icon="building"
            placeholder="Gym Key"
            onChange={(gymKey) => this.setState({ gymKey })}
            value={this.state.gymKey}
          />
          <TextField
            icon="user"
            placeholder="Company Tax ID"
            keyboard="number-pad"
            onChange={(taxId) => this.setState({ taxId })}
            value={this.state.taxId}
          />
          <TextField
            icon="user"
            placeholder="Social Security Number"
            keyboard="number-pad"
            onChange={(ssn) => this.setState({ ssn })}
            value={this.state.ssn}
          />
          <TextField
            icon="calendar"
            placeholder="Birth Date (mm/dd/yyyy)"
            onChange={(birthDay) => this.setState({ birthDay })}
            value={this.state.birthDay}
          />
        </View>
      );
    } else if (this.state.page === 3) {
      nextButton = null;
      page3 = (
        <View style={styles.container}>
          <TextField
            icon="envelope"
            placeholder="Address"
            onChange={(address) => this.setState({ address })}
            value={this.state.address}
          />
          <TextField
            icon="map"
            placeholder="City"
            onChange={(city) => this.setState({ city })}
            value={this.state.city}
          />
          <TextField
            icon="map-marker"
            placeholder="Zip Code"
            onChange={(zip) => this.setState({ zip })}
            value={this.state.zip}
          />
          <TextField
            icon="map"
            placeholder="State (Abbreviation)"
            onChange={(state) => this.setState({ state })}
            value={this.state.state}
          />
        </View>
      );

      submitButton = (
        <TouchableOpacity
          ref={(btn) => { this.btn = btn; }}
          style={styles.buttonContainer}
          onPressIn={this.onSignUpPress}
        >
          <Text style={styles.buttonText}> Signup </Text>
        </TouchableOpacity>
      );

      agreement = (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.agreement}>
            By registering for an account you agree to the
            {' '}
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/legal')}>
            <Text style={styles.link}> Stripe Services Agreement</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/connect-account/legal')}>
            <Text style={styles.link}> Stripe Connected Account Agreement</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('http://trainnow.fit/user-agreement-privacy-policy/')}>
            <Text style={styles.link}> TrainNow User Agreement</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.formContainer}>
        {page1}
        {page2}
        {page3}
        {page4}
        <View style={styles.buttonHolder}>
          {prevButton}
          {nextButton}
          {submitButton}
        </View>
        {agreement}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  formContainer: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    height: '80%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  buttonContainer: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    width: '40%',
    margin: 5,
    borderRadius: 5,
  },
  buttonHolder: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  agreement: {
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  link: {
    color: COLORS.PRIMARY,
    textAlign: 'center',
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