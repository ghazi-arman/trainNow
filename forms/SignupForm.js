import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Switch, Image, Picker, Linking } from 'react-native';
import { Actions } from 'react-native-router-flux';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
const stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');
const defaultProfilePic = require('../images/profile.png');

export class SignupForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      trainer: false,
      page: 1,
      pressed: false,
      image: defaultProfilePic.uri
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.gymLoaded) {
      try{
        const gyms = await this.loadGyms();
        this.setState({ gyms: gyms, gymLoaded: true });
      } catch(error) {
        this.bugsnagClient.notify(error);
      }
    }
  }

  loadGyms = async() => {
    let gyms = [];
    const gymsList = await firebase.database().ref('gyms').once('value');
    gymsList.forEach(function (snapshot) {
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
      let result = await ImagePicker.launchImageLibraryAsync({
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

  uploadImage = async(uri, uid) => {
    try{
      // Create image blob for upload
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          resolve(xhr.response);
        };
        xhr.onerror = function(error) {
          reject(new Error(error));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      // Upload image to firebase storage
      await firebase.storage().ref().child(uid).put(blob);
    } catch(error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.')
    }
  }

  signUp = async() => {
    // Prevent multiple submissions
    if (this.state.pressed) {
      return;
    }
    this.state.pressed = true;
    let firstName = this.state.name.split(" ")[0];
    let lastName = this.state.name.split(" ")[1];

    if (this.state.trainer) {
      const gymKey = this.state.gyms[this.state.gym].key;
      const gymType = this.state.gyms[this.state.gym].type;
      if (gymType == 'independent') {
        let ssn = {
          pii: {
            personal_id_number: this.state.ssn.replace(/\D/g,'')
          }
        }

        try {
          // Create token from social security number
          var token = await stripe.createToken(ssn);
        } catch (error) {
          this.state.pressed = false;
          this.bugsnagClient.notify(error);
          Alert.alert('Invalid Social Security Number entered. Please check your info and try again!');
          return;
        }
        const month = this.state.birthDay.split("/")[0];
        const day = this.state.birthDay.split("/")[1];
        const year = this.state.birthDay.split("/")[2];

        try {
          // Call firebase cloud function to create stripe account
          const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createTrainer/',
          {
            method: 'POST',
            body: JSON.stringify({
              line1: this.state.address,
              city: this.state.city,
              state: this.state.state,
              zip: this.state.zip,
              email: this.state.email,
              phone: this.state.phone.replace(/\D/g,''),
              firstName: firstName,
              lastName: lastName,
              token: token.id,
              day: day,
              month: month,
              year: year
            }),
          });
          const response = await res.json();
          var data = JSON.parse(response.body);
          
          if(data.message !== 'Success') {
            throw new Error('Stripe Error');
          }
        } catch (error) {
          this.state.pressed = false;
          this.bugsnagClient.notify(error);
          Alert.alert('There was an error creating your stripe Account. Please review your information and try again!');
          return;
        }
      }

      try {
        const user = await firebase.auth().createUserWithEmailAndPassword(this.state.email, this.state.password);
        if (gymType === 'independent'){
          var pending = false;
          var gymRef = firebase.database().ref('/gyms/' + gymKey + '/trainers/');
        }else{
          var pending = true;
          var gymRef = firebase.database().ref('/gyms/' + gymKey + '/pendingtrainers/');
        }

        gymRef.child(user.user.uid).set({
          active: false,
          bio: this.state.bio,
          cert: this.state.cert,
          name: this.state.name,
          rate: this.state.rate.replace(/\D/g,''),
          rating: 0
        });

        firebase.database().ref('users').child(user.user.uid).set({
          trainer: true,
          type: gymType,
          pending: pending,
          name: this.state.name,
          gym: gymKey,
          cert: this.state.cert,
          rate: this.state.rate.replace(/\D/g,''),
          bio: this.state.bio,
          phone: this.state.phone.replace(/\D/g,''),
          active: false,
          rating: 0,
          sessions: 0,
        });

        if (gymType !== 'independent') {
          const gymOwnerKey = this.state.gyms[this.state.gym].ownerKey;
          firebase.database().ref('users').child(user.user.uid).update({
            ownerKey: gymOwnerKey
          })
        }
          
        if (this.state.image) {
          this.uploadImage(this.state.image, user.user.uid);
        }

        if(gymType == 'independent'){
          firebase.database().ref('users').child(user.user.uid).update({stripeId: data.trainer.id, cardAdded: false});
          await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
          Actions.reset('SchedulePage');
          Alert.alert('You must enter a debit card for payouts before trainees can book a session with you!');
        }else{
          Actions.reset('LoginPage');
          Alert.alert('Your account is now pending approval. Sign in once your gym manager approves your account.');
        }

      } catch(error) {
        this.state.pressed = false;
        this.bugsnagClient.notify(error);
        Alert.alert("There was an error creating your account. Please review your info and try again.");
        return;
      }
    } else {
      try {
        const user = await firebase.auth().createUserWithEmailAndPassword(this.state.email, this.state.password);
        firebase.database().ref('users').child(user.user.uid).set({
          trainer: false,
          name: this.state.name,
          phone: this.state.phone.replace(/\D/g,''),
          rating: 0,
          sessions: 0,
          cardAdded: false,
        });

        if (this.state.image) {
          this.uploadImage(this.state.image, user.user.uid);
        }

        await firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password);
        Actions.reset("MapPage");

      } catch(error) {
        this.state.pressed = false;
        this.bugsnagClient.notify(error);
        Alert.alert("There was an error creating your account. Please try again.");
      }
    }
  }

  goBack = () => {
    if (this.state.page == 2) {
      this.setState({ page: 1 });
    } else if (this.state.page == 3) {
      this.setState({ page: 2 });
    } else {
      if (this.state.trainer) {
        if (this.state.gyms[this.state.gym].type == 'owner') {
          this.setState({ page: 2 })
        } else {
          this.setState({ page: 3 });
        }
      } else {
        this.setState({ page: 1 });
      }
    }
  }

  goNext = async() => {
    if (this.state.page === 1) {

      if (!this.state.name) {
        Alert.alert("Please enter a name!");
        return;
      }
      if (!this.state.email) {
        Alert.alert("Please enter an email!");
        return;
      }
      if (!this.state.password || this.state.password.trim().length < 6) {
        Alert.alert("Please enter a password at least 6 characters long!");
        return;
      }
      if (!this.state.confirmPass || this.state.password != this.state.confirmPass) {
        Alert.alert("Passwords must match!");
        return;
      }
      if (!this.state.phone || this.state.phone.replace(/\D/g,'').length < 10) {
        Alert.alert("Please enter a valid phone number");
        return;
      }
      try {
				const emailCheck = await firebase.auth().fetchSignInMethodsForEmail(this.state.email);
				if(emailCheck.length) {
					Alert.alert("That email is already in use");
					return;
				}
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert("Please enter a valid email");
				return;
      }

      if (this.state.trainer) {
        this.setState({ page: 2 });
      } else {
        this.setState({ page: 4 });
      }

    } else if (this.state.page === 2) {
      if (this.state.gym === undefined) {
        Alert.alert("Please select a gym!");
        return;
      }
      if (!this.state.cert) {
        Alert.alert("Please enter your certifications!");
        return;
      }
      if (!this.state.bio) {
        Alert.alert("Please fill out your bio!");
        return;
      }
      if (this.state.gyms[this.state.gym].type == 'owner') {
        this.setState({ page: 4 });
      } else {
        if (!this.state.rate || this.state.rate.replace(/\D/g,'') < 25) {
          Alert.alert("Please enter your rate (has to be $25+)!");
          return;
        }
        if (!this.state.ssn || this.state.ssn.replace(/\D/g,'').length < 9) {
          Alert.alert("Please enter a valid Social Security Number!");
          return;
        }
        if (!this.state.birthDay || this.state.birthDay.replace(/\D/g,'').length < 8) {
          Alert.alert("Please enter a valid formatted birthday!");
          return;
        }
        this.setState({ page: 3 });
      }
    } else {
      if (!this.state.address) {
        Alert.alert("Please enter an address!");
        return;
      }
      if (!this.state.city) {
        Alert.alert("Please enter a city!");
        return;
      }
      if (!this.state.zip || this.state.zip.length != 5) {
        Alert.alert("Please enter a valid 5 digit zip code!");
        return;
      }
      if (!this.state.state || this.state.state.length != 2) {
        Alert.alert("Please enter a valid state Abbreviation!");
        return;
      }
      this.setState({ page: 4 });
    }
  }

  render() {
    if(!this.state.gymLoaded) {
      return <AppLoading />;
    }
    let image = this.state.image;
    let page1 = page2 = page3 = page4 = null;
    let submitButton = agreement = null;

    prevButton = (
      <TouchableOpacity style={styles.buttonContainer} onPressIn={this.goBack}>
        <Text style={styles.buttonText}> Previous </Text>
      </TouchableOpacity>
    );

    nextButton = (
      <TouchableOpacity style={styles.buttonContainer} onPressIn={this.goNext}>
        <Text style={styles.buttonText}> Next </Text>
      </TouchableOpacity>
    );

    if (this.state.page == 1) {
      prevButton = null;
      page1 = (
        <View style={styles.container}>
          <TextField 
            icon={Icons.user}
            placeholder="Name (First and Last)"
            onChange={(name) => this.setState({ name })}
            value={this.state.name}
          />
          <TextField 
            icon={Icons.envelope}
            placeholder="Email"
            keyboard="email-address"
            onChange={(email) => this.setState({ email })}
            value={this.state.email}
          />
          <TextField 
            icon={Icons.lock}
            placeholder="Password"
            secure={true}
            onChange={(password) => this.setState({ password })}
            value={this.state.password}
          />
          <TextField 
            icon={Icons.lock}
            placeholder="Confirm Password"
            secure={true}
            onChange={(confirmPass) => this.setState({ confirmPass })}
            value={this.state.confirmPass}
          />
          <TextField 
            icon={Icons.phone}
            placeholder="Phone Number"
            keyboard="number-pad"
            onChange={(phone) => this.setState({ phone })}
            value={this.state.phone}
          />
          <View style={styles.inputRow}>
            <Text style={styles.hints}>Are you signing up as a trainer? </Text>
            <Switch
              trackColor={COLORS.PRIMARY}
              trackColor={COLORS.PRIMARY}
              _thumbColor={COLORS.SECONDARY}
              value={this.state.trainer}
              onValueChange={(trainer) => this.setState({ trainer })}
            />
          </View>
        </View>
      );
    } else if (this.state.page == 2) {
      page2 = (
        <View style={styles.container}>
          <View style={styles.inputRow}>
            <Text style={styles.icon}>
              <FontAwesome>{Icons.building}</FontAwesome>
            </Text>
            <Picker
              style={styles.picker}
              itemStyle={{ height: 45, color: COLORS.PRIMARY }}
              selectedValue={this.state.gym}
              onValueChange={(itemValue) => this.setState({ gym: itemValue })}>
              <Picker.Item label="Pick a Gym (Scroll)" value='none' key='0' />
              {this.state.gyms.map(function (gym, index) {
                return (<Picker.Item label={gym.name} value={index} key={gym.key} />);
              })}
            </Picker>
          </View>
          <TextField 
            icon={Icons.dollar}
            placeholder="Rate ($ hourly)"
            keyboard="number-pad"
            onChange={(rate) => this.setState({ rate })}
            value={this.state.rate}
          />
          <TextField 
            icon={Icons.info}
            multiline={true}
            placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
            onChange={(bio) => this.setState({ bio })}
            value={this.state.bio}
          />
          <TextField 
            icon={Icons.vcard}
            placeholder="Certifications"
            onChange={(cert) => this.setState({ cert })}
            value={this.state.cert}
          />
          <TextField 
            icon={Icons.user}
            placeholder="SSN (For Stripe Account)"
            keyboard="number-pad"
            onChange={(ssn) => this.setState({ ssn })}
            value={this.state.ssn}
          />
          <TextField 
            icon={Icons.user}
            placeholder="Birth Date (mm/dd/yyyy)"
            onChange={(birthDay) => this.setState({ birthDay })}
            value={this.state.birthDay}
          />
        </View>
      );
    } else if (this.state.page == 3) {
      page3 = (
        <View>
          <TextField 
            icon={Icons.envelope}
            placeholder="Address"
            onChange={(address) => this.setState({ address })}
            value={this.state.address}
          />
          <TextField 
            icon={Icons.map}
            placeholder="City"
            onChange={(city) => this.setState({ city })}
            value={this.state.city}
          />
          <TextField 
            icon={Icons.mapMarker}
            placeholder="Zip Code"
            keyboard="number-pad"
            onChange={(zip) => this.setState({ zip })}
            value={this.state.zip}
          />
          <TextField 
            icon={Icons.map}
            placeholder="State (Abbreviation eg. CA)"
            onChange={(state) => this.setState({ state })}
            value={this.state.state}
          />
        </View>
      );
    } else {
      nextButton = null;
      let buttonText = 'Add Picture';
      let profileImage = <Image source={defaultProfilePic} style={styles.imageHolder} />
      if (image != defaultProfilePic.uri) {
        buttonText = 'Change';
        profileImage = <Image source={{ uri: image }} style={styles.imageHolder} />
      }
      page4 = (
        <View style={styles.imageContainer}>
          {profileImage}
          <TouchableOpacity style={styles.pictureButton} onPressIn={this.pickImage}>
            <Text style={styles.pictureButtonText}> {buttonText} </Text>
          </TouchableOpacity>
        </View>
      );

      submitButton = (
        <TouchableOpacity ref={btn => { this.btn = btn; }} style={styles.buttonContainer} onPressIn={this.signUp}>
          <Text style={styles.buttonText}> Signup </Text>
        </TouchableOpacity>
      );
      
      agreement = (
        <View style={{ marginTop: 15 }}>
          <Text style={styles.agreement}>
            By registering for an account you agree to the </Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/legal')}>
            <Text style={styles.link}> Stripe Services Agreement</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/connect-account/legal')}>
            <Text style={styles.link}> Stripe Connected Account Agreement.</Text>
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
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20
  },
  picker: {
    height: 45,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    width: '90%',
  },
  buttonContainer: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    width: '45%',
    margin: 5,
  },
  buttonHolder: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10
  },
  pictureButton: {
    padding: 10,
    backgroundColor: COLORS.PRIMARY,
    height: 50,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5
  },
  pictureButtonText: {
    fontWeight: '700',
    color: '#f6f5f5',
    fontSize: 20,
    textAlign: 'center'
  },
  buttonText: {
    fontSize: 20,
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
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
    borderColor: COLORS.PRIMARY,
    marginBottom: 10
  },
  icon: {
    color: COLORS.PRIMARY,
    fontSize: 30,
    marginRight: 10,
    marginTop: 13
  },
  hints: {
    color: COLORS.PRIMARY,
    marginBottom: 10,
    marginRight: 10
  },
  agreement: {
    color: COLORS.PRIMARY,
    textAlign: 'center'
  },
  link: {
    color: COLORS.PRIMARY,
    textAlign: 'center',
    textDecorationLine: 'underline'
  }
});