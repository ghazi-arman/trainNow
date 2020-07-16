import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
  Picker,
  Linking,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import bugsnag from '@bugsnag/expo';
import { FB_URL } from 'react-native-dotenv';
import Colors from '../components/Colors';
import TextField from '../components/TextField';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import defaultProfilePic from '../images/profile.png';

export default class SignupForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      trainer: false,
      page: 1,
      pressed: false,
      image: defaultProfilePic.uri,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.gymLoaded) {
      try {
        const gyms = await this.loadGyms();
        this.setState({ gyms, gymLoaded: true });
      } catch (error) {
        this.bugsnagClient.notify(error);
      }
    }
  }

  loadGyms = async () => {
    const gyms = [];
    const gymsList = await firebase.database().ref('gyms').once('value');
    gymsList.forEach((snapshot) => {
      const gym = snapshot.val();
      gym.key = snapshot.key;
      gyms.push(gym);
    });
    return gyms;
  }

  pickImage = async () => {
    // Ask for image permissions from phone
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
    if (status === 'granted') {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });

      // Upload image to state for updateAccount call
      if (!result.cancelled) {
        this.setState({ image: result.uri });
      }
      return;
    }
    Alert.alert('Camera roll permission not granted');
  }

  uploadImage = async (uri, uid) => {
    try {
      // Create image blob for upload
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
          resolve(xhr.response);
        };
        xhr.onerror = (error) => {
          reject(new Error(error));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      // Upload image to firebase storage
      await firebase.storage().ref().child(uid).put(blob);
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.');
    }
  }

  signUp = async () => {
    // Prevent multiple submissions
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });
    const firstName = this.state.name.split(' ')[0];
    const lastName = this.state.name.split(' ')[1];
    let user;
    let response;

    if (this.state.trainer) {
      const gymKey = this.state.gyms[this.state.gym].key;
      const gymType = this.state.gyms[this.state.gym].type;
      const gymName = this.state.gyms[this.state.gym].name;
      if (gymType === Constants.independentType) {
        const month = this.state.birthDay.split('/')[0];
        const day = this.state.birthDay.split('/')[1];
        const year = this.state.birthDay.split('/')[2];

        try {
          // Call firebase cloud function to create stripe account
          const res = await fetch(`${FB_URL}/stripe/createTrainer/`,
            {
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
                ssn: this.state.ssn,
                day,
                month,
                year,
              }),
            });
          response = await res.json();

          if (response.body.message !== 'Success') {
            throw new Error('Stripe Error');
          }
        } catch (error) {
          Alert.alert('There was an error creating your stripe Account. Please review your information and try again!');
          this.setState({ pressed: false });
          this.bugsnagClient.notify(error);
          return;
        }
      }

      let gymRef;
      try {
        let pending;
        user = await firebase.auth().createUserWithEmailAndPassword(
          this.state.email,
          this.state.password,
        );
        if (gymType === Constants.independentType) {
          pending = false;
          gymRef = firebase.database().ref(`/gyms/${gymKey}/trainers/`);
        } else {
          pending = true;
          gymRef = firebase.database().ref(`/gyms/${gymKey}/pendingtrainers/`);
        }

        gymRef.child(user.user.uid).set({
          active: false,
          bio: this.state.bio,
          cert: this.state.cert,
          name: this.state.name,
          rate: parseInt(this.state.rate, 10),
          rating: 0,
          offset: 0,
        });

        firebase.database().ref('users').child(user.user.uid).set({
          type: 'trainer',
          trainerType: gymType,
          pending,
          name: this.state.name,
          cert: this.state.cert,
          rate: parseInt(this.state.rate, 10),
          bio: this.state.bio,
          phone: this.state.phone,
          active: false,
          rating: 0,
          sessions: 0,
          offset: 0,
        });

        firebase.database().ref(`/users/${user.user.uid}/gyms/${gymKey}`).set({
          name: gymName,
          type: gymType,
          primary: true,
        });

        if (gymType === Constants.managedType) {
          const gymManagerKey = this.state.gyms[this.state.gym].managerKey;
          firebase.database().ref('users').child(user.user.uid).update({
            managerKey: gymManagerKey,
          });
        }

        if (this.state.image) {
          this.uploadImage(this.state.image, user.user.uid);
        }

        if (gymType === Constants.independentType) {
          await firebase.database().ref('users').child(user.user.uid).update({ stripeId: response.body.trainer.id, cardAdded: false });
          await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
          Actions.reset('CalendarPage');
          Alert.alert('You must enter a debit card for payouts before clients can book a session with you!');
        } else {
          Actions.reset('LoginPage');
          Alert.alert('Your account is now pending approval. Sign in once your gym manager approves your account.');
        }
      } catch (error) {
        try {
          if (user.user.uid) {
            await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
            if (gymType === Constants.independentType) {
              const idToken = await firebase.auth().currentUser.getIdToken(true);
              const res = await fetch(`${FB_URL}/stripe/deleteTrainer/`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: idToken,
                  },
                  body: JSON.stringify({
                    stripeId: response.body.trainer.id,
                  }),
                });
              response = await res.json();

              if (response.body.message !== 'Success') {
                throw new Error('Stripe Error');
              }
            }
            firebase.database().ref('users').child(user.user.uid).remove();
            gymRef.child(user.user.uid).remove();
            firebase.auth().currentUser.delete();
          }
          Alert.alert('There was an error creating your account. Please review your info and try again.');
          this.setState({ pressed: false });
          this.bugsnagClient.notify(error);
          return;
        } catch (err) {
          Alert.alert('There was an error creating your account. Please review your info and try again.');
          this.setState({ pressed: false });
          this.bugsnagClient.notify(err);
        }
      }
    } else {
      try {
        user = await firebase.auth().createUserWithEmailAndPassword(
          this.state.email,
          this.state.password,
        );
        firebase.database().ref('users').child(user.user.uid).set({
          type: 'client',
          name: this.state.name,
          phone: this.state.phone,
          rating: 0,
          sessions: 0,
          cardAdded: false,
        });

        if (this.state.image) {
          this.uploadImage(this.state.image, user.user.uid);
        }

        await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
        Actions.reset('MapPage');
      } catch (error) {
        try {
          if (user.user.uid) {
            await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
            firebase.database().ref('users').child(user.user.uid).remove();
            firebase.auth().currentUser.delete();
          }
          Alert.alert('There was an error creating your account. Please review your info and try again.');
          this.setState({ pressed: false });
          this.bugsnagClient.notify(error);
          return;
        } catch (err) {
          Alert.alert('There was an error creating your account. Please review your info and try again.');
          this.setState({ pressed: false });
          this.bugsnagClient.notify(err);
        }
      }
    }
  }

  goBack = () => {
    if (this.state.page === 2) {
      this.setState({ page: 1 });
    } else if (this.state.page === 3) {
      this.setState({ page: 2 });
    } else if (this.state.trainer) {
      if (this.state.gyms[this.state.gym].type === Constants.managedType) {
        this.setState({ page: 2 });
      } else {
        this.setState({ page: 3 });
      }
    } else {
      this.setState({ page: 1 });
    }
  }

  goNext = async () => {
    if (this.state.page === 1) {
      if (!this.state.name.trim()) {
        Alert.alert('Please enter a name!');
        return;
      }
      if (this.state.name.trim().split(' ').length !== 2) {
        Alert.alert('Please enter a first and last name (no middle name).');
        return;
      }
      if (!this.state.email.trim()) {
        Alert.alert('Please enter an email!');
        return;
      }
      if (!this.state.password || this.state.password.trim().length < 6) {
        Alert.alert('Please enter a password at least 6 characters long!');
        return;
      }
      if (this.state.password !== this.state.confirmPassword) {
        Alert.alert('Passwords must match!');
        return;
      }
      if (!this.state.phone.trim() || this.state.phone.trim().length < 10) {
        Alert.alert('Please enter a valid phone number');
        return;
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

      if (this.state.trainer) {
        this.setState({ page: 2 });
      } else {
        this.setState({ page: 4 });
      }
    } else if (this.state.page === 2) {
      if (this.state.gym === undefined || this.state.gym === 'none') {
        Alert.alert('Please select a gym!');
        return;
      }
      if (!this.state.cert.trim()) {
        Alert.alert('Please enter your certifications!');
        return;
      }
      if (!this.state.bio.trim()) {
        Alert.alert('Please fill out your bio!');
        return;
      }
      if (this.state.gyms[this.state.gym].type === Constants.managedType) {
        this.setState({ page: 4 });
      } else {
        if (!this.state.rate || parseInt(this.state.rate, 10) < 25) {
          Alert.alert('Please enter your rate (has to be $25+)!');
          return;
        }
        if (!this.state.ssn.trim() || this.state.ssn.trim().length !== 4) {
          Alert.alert('Please enter a valid Social Security Number! Just the last four digits.');
          return;
        }
        if (
          !this.state.birthDay.trim()
          || this.state.birthDay.trim().length < 8
          || this.state.birthDay.trim().split('/').length !== 3
        ) {
          Alert.alert('Please enter a valid formatted birthday (mm/dd/yyyy)!');
          return;
        }
        this.setState({ page: 3 });
      }
    } else {
      if (!this.state.address.trim()) {
        Alert.alert('Please enter an address!');
        return;
      }
      if (!this.state.city.trim()) {
        Alert.alert('Please enter a city!');
        return;
      }
      if (!this.state.zip.trim() || this.state.zip.trim().length !== 5) {
        Alert.alert('Please enter a valid 5 digit zip code!');
        return;
      }
      if (!this.state.state.trim() || this.state.state.trim().length !== 2) {
        Alert.alert('Please enter a valid state Abbreviation!');
        return;
      }
      this.setState({ page: 4 });
    }
  }

  render() {
    if (!this.state.gymLoaded || this.state.pressed) {
      return <LoadingWheel />;
    }

    const { image } = this.state;
    let page1;
    let page2;
    let page3;
    let page4;
    let submitButton;
    let agreement;
    let nextButton;
    let prevButton;

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
            placeholder="Name (First and Last)"
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
            onChange={(confirmPassword) => this.setState({ confirmPassword })}
            value={this.state.confirmPassword}
          />
          <TextField
            icon="phone"
            placeholder="Phone Number"
            keyboard="number-pad"
            onChange={(phone) => this.setState({ phone })}
            value={this.state.phone}
          />
          <View style={styles.inputRow}>
            <Text style={styles.hints}>Are you signing up as a trainer? </Text>
            <Switch
              trackColor={Colors.Primary}
              _thumbColor={Colors.Secondary}
              value={this.state.trainer}
              onValueChange={(trainer) => this.setState({ trainer })}
            />
          </View>
        </View>
      );
    } else if (this.state.page === 2) {
      let rateFieldEditable;
      if (this.state.gym !== undefined && this.state.gym !== 'none') {
        rateFieldEditable = (this.state.gyms[this.state.gym].type === Constants.independentType);
        if (!rateFieldEditable) {
          this.state.rate = '50';
        }
      }
      page2 = (
        <View style={styles.container}>
          <View style={styles.inputRow}>
            <Text style={styles.icon}>
              <FontAwesome name="building" size={30} />
            </Text>
            <Picker
              style={styles.picker}
              itemStyle={{ height: 45, color: Colors.Primary }}
              selectedValue={this.state.gym}
              onValueChange={(itemValue) => this.setState({ gym: itemValue })}
            >
              <Picker.Item label="Pick a Gym (Scroll)" value="none" key="0" />
              {this.state.gyms.map(
                (gym, index) => (<Picker.Item label={gym.name} value={index} key={gym.key} />),
              )}
            </Picker>
          </View>
          <TextField
            icon="dollar"
            placeholder="Rate ($ hourly)"
            keyboard="number-pad"
            onChange={(rate) => this.setState({ rate })}
            editable={rateFieldEditable}
            value={this.state.rate}
          />
          <TextField
            icon="info"
            multiline
            placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
            onChange={(bio) => this.setState({ bio })}
            value={this.state.bio}
          />
          <TextField
            icon="vcard"
            placeholder="Certifications"
            onChange={(cert) => this.setState({ cert })}
            value={this.state.cert}
          />
          <TextField
            icon="user"
            placeholder="Last 4  of Social Security # (For Stripe Verification)"
            keyboard="number-pad"
            onChange={(ssn) => this.setState({ ssn })}
            value={this.state.ssn}
          />
          <TextField
            icon="user"
            placeholder="Birth Date (mm/dd/yyyy)"
            onChange={(birthDay) => this.setState({ birthDay })}
            value={this.state.birthDay}
          />
        </View>
      );
    } else if (this.state.page === 3) {
      page3 = (
        <View>
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
            keyboard="number-pad"
            onChange={(zip) => this.setState({ zip })}
            value={this.state.zip}
          />
          <TextField
            icon="map"
            placeholder="State (Abbreviation eg. CA)"
            onChange={(state) => this.setState({ state })}
            value={this.state.state}
          />
        </View>
      );
    } else {
      nextButton = null;
      let buttonText = 'Add Picture';
      let profileImage = <Image source={defaultProfilePic} style={styles.imageHolder} />;
      if (image !== defaultProfilePic.uri) {
        buttonText = 'Change';
        profileImage = <Image source={{ uri: image }} style={styles.imageHolder} />;
      }
      page4 = (
        <View style={styles.imageContainer}>
          {profileImage}
          <TouchableOpacity style={styles.pictureButton} onPress={this.pickImage}>
            <Text style={styles.pictureButtonText}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      );

      submitButton = (
        <TouchableOpacity
          ref={(btn) => { this.btn = btn; }}
          style={styles.buttonContainer}
          onPressIn={this.signUp}
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
          <TouchableOpacity
            onPress={() => Linking.openURL('https://stripe.com/en-US/legal')}
          >
            <Text style={styles.link}> Stripe Services Agreement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://stripe.com/en-US/connect-account/legal')}
          >
            <Text style={styles.link}> Stripe Connected Account Agreement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('http://trainnow.fit/user-agreement-privacy-policy/')}
          >
            <Text style={styles.link}> TrainNow User Agreement</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={MasterStyles.centeredContainer}>
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
  container: {
    height: '80%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  picker: {
    height: 45,
    borderWidth: 1,
    borderColor: Colors.Primary,
    width: '90%',
  },
  buttonContainer: {
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: '40%',
    borderRadius: 5,
    margin: 5,
  },
  buttonHolder: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  pictureButton: {
    padding: 10,
    backgroundColor: Colors.Primary,
    height: 50,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    borderRadius: 5,
  },
  pictureButtonText: {
    fontWeight: '700',
    color: '#f6f5f5',
    fontSize: 20,
    textAlign: 'center',
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: Colors.LightGray,
    fontWeight: '700',
  },
  imageContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHolder: {
    width: 220,
    height: 220,
    borderWidth: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: Colors.Primary,
    marginBottom: 10,
  },
  icon: {
    color: Colors.Primary,
    fontSize: 30,
    marginRight: 10,
    marginTop: 13,
    width: 35,
    textAlign: 'center',
  },
  hints: {
    color: Colors.Primary,
    marginBottom: 10,
    marginRight: 10,
  },
  agreement: {
    color: Colors.Primary,
    textAlign: 'center',
  },
  link: {
    color: Colors.Primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
