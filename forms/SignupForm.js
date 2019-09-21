import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Alert, Switch, Image, Picker, Linking } from 'react-native';
import { Actions } from 'react-native-router-flux';
import * as Permissions from 'expo-permissions';
import * as Font from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
const stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');

export class SignupForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      trainer: false,
      page: 1,
      fontLoaded: false,
      gymLoaded: false,
      gym: 'none',
      image: 'null',
      pressed: false
    };

    this.signUp = this.signUp.bind(this);
    this.goNext = this.goNext.bind(this);
    this.goBack = this.goBack.bind(this);
  }

  async componentDidMount() {
    if (!this.state.fontLoaded) {
      this.loadFont();
    }

    if (!this.state.gymLoaded) {
      let gyms = this.loadGyms();
      this.setState({ gyms: gyms, gymLoaded: true });
    }
  }

  loadFont = async () => {
    await Font.loadAsync({
      FontAwesome: require('../fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
    });
    this.setState({ fontLoaded: true });
  }

  loadGyms() {
    let gyms = [];
    let gymsRef = firebase.database().ref('gyms');
    gymsRef.once('value', function (data) {
      data.forEach(function (snapshot) {
        let gym = snapshot.val();
        gym.key = snapshot.key;
        gyms.push(gym);
      });
    });
    return gyms;
  }

  pickImage = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
    if (status === 'granted') {
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.cancelled) {
        this.setState({ image: result.uri });
      }
    } else {
      throw new Error('Camera roll permission not granted');
    }
  }

  async uploadImage(uri, uid) {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        Alert.alert('There was an error uploading your picture. Try again in the settings page.');
        return;
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
    const ref = firebase.storage().ref().child(uid);
    const snapshot = await ref.put(blob);
    blob.close();
    return snapshot.downloadURL;
  }

  async signUp() {
    // client side authentication
    if (this.state.pressed) {
      return;
    }
    this.state.pressed = true;
    let nameSplit = this.state.name.split(" ");
    let firstName = nameSplit[0];
    let lastName = nameSplit[1];

    if (this.state.trainer) {
      const gymKey = this.state.gyms[this.state.gym].key;
      const gymType = this.state.gyms[this.state.gym].type
      if (gymType == 'independent') {
        let ssn = {
          pii: {
            personal_id_number: this.state.ssn
          }
        }

        // create ssn token
        try {
          var pii = await stripe.createToken(ssn);
        } catch (error) {
          this.state.pressed = false;
          Alert.alert('Invalid SSN entered. Please check your info and try again!');
          return;
        }
        var token = pii.id;
        let dateSplit = this.state.birthDay.split("/");
        const month = dateSplit[0];
        const day = dateSplit[1];
        const year = dateSplit[2];

        // create stripe account
        try {
          const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createTrainer/',
          {
            method: 'POST',
            body: JSON.stringify({
              line1: this.state.address,
              city: this.state.city,
              state: this.state.state,
              zip: this.state.zip,
              email: this.state.email,
              phone: this.state.phone,
              firstName: firstName,
              lastName: lastName,
              token: token,
              day: day,
              month: month,
              year: year
            }),
          });
          var data = await res.json();
          data.body = JSON.parse(data.body);
          console.log(data.body);
        } catch (error) {
          this.state.pressed = false;
          Alert.alert('There wan an error creating your stripe Account. Please review your email, address, birthday, and ssn and try again!');
          return;
        }
      }

      firebase.auth().createUserWithEmailAndPassword(this.state.email, this.state.password)
        .then(async function (firebaseUser) {
        if(gymType == 'independent'){
          var pending = false;
          var gymRef = firebase.database().ref('/gyms/' + gymKey + '/trainers/');
        }else{
          var pending = true;
          var gymRef = firebase.database().ref('/gyms/' + gymKey + '/pendingtrainers/');
        }

        gymRef.child(firebaseUser.uid).set({
          active: false,
          bio: this.state.bio,
          cert: this.state.cert,
          name: this.state.name,
          rate: this.state.rate,
          rating: 0
        });

        let userRef = firebase.database().ref('users');
        userRef.child(firebaseUser.uid).set({
          trainer: true,
          type: gymType,
          pending: pending,
          name: this.state.name,
          gym: gymKey,
          cert: this.state.cert,
          rate: this.state.rate,
          bio: this.state.bio,
          phone: this.state.phone,
          active: false,
          rating: 0,
          sessions: 0,
        });
        
        if (this.state.image != 'null') {
          this.uploadImage(this.state.image, firebaseUser.uid);
        }

        if(gymType == 'independent'){
          userRef.child(firebaseUser.uid).update({stripeId: data.body.trainer.id, cardAdded: false})
          firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function () {
            Actions.reset('SchedulePage');
            Alert.alert('You must enter a debit card for payouts before trainees can book a session with you!');
          });
        }else{
          Actions.reset('LoginPage');
          Alert.alert('Your account is now pending approval. Sign in once your gym manager approves your account.');
        }
      }.bind(this)).catch(function (error) {
        this.state.pressed = false;
        Alert.alert(error.message);
        return;
      }.bind(this));
    } else {
    firebase.auth().createUserWithEmailAndPassword(this.state.email, this.state.password)
      .then(async function (firebaseUser) {
        let userRef = firebase.database().ref('users');
        userRef.child(firebaseUser.uid).set({
          trainer: false,
          name: this.state.name,
          phone: this.state.phone,
          rating: 0,
          sessions: 0,
          cardAdded: false,
        });

        if (this.state.image != 'null') {
          this.uploadImage(this.state.image, firebaseUser.uid);
        }

        firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function () {
          Actions.reset('MapPage')
        });
      }.bind(this)).catch(function (error) {
        this.state.pressed = false;
        Alert.alert(error.message);
        return;
      }.bind(this));
    }
  }

  goBack() {
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

  async goNext() {
    if (this.state.page == 1) {

      if (!this.state.name) {
        Alert.alert("Please enter a name!");
        return;
      }
      if (!this.state.email) {
        Alert.alert("Please enter an email!");
        return;
      }
      if (!this.state.password || this.state.password.length < 6) {
        Alert.alert("Please enter a password at least 6 characters long!");
        return;
      }
      if (!this.state.confirmPass || this.state.password != this.state.confirmPass) {
        Alert.alert("Passwords must match!");
        return;
      }
      if (!this.state.phone || this.state.phone.length < 10) {
        Alert.alert("Please enter a valid phone number");
        return;
      }
      var validEmail = true;
      await firebase.auth().fetchSignInMethodsForEmail(this.state.email).then(function (methods) {
        if (methods.length > 0) {
          Alert.alert("That email is already in use.");
          validEmail = false;
          return;
        }
      }, function (error) {
        Alert.alert("Please enter a valid email");
        validEmail = false;
        return;
      }.bind(this));

      if(!validEmail){
        return;
      }

      if (this.state.trainer) {
        this.setState({ page: 2 });
      } else {
        this.setState({ page: 4 });
      }

    } else if (this.state.page == 2) {
      if (this.state.gym == 'none') {
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
        if (this.state.rate == "" || this.state.rate < 25) {
          Alert.alert("Please enter your rate (has to be $25+)!");
          return;
        }
        if (!this.state.ssn) {
          Alert.alert("Please enter your SSN!");
          return;
        }
        if (!this.state.birthDay) {
          Alert.alert("Please enter your birthday!");
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

    let image = this.state.image;
    let gyms = this.state.gyms;
    let page1 = page2 = page3 = page4 = null;
    let submitButton = agreement = null;

    prevButton = (
      <TouchableOpacity style={styles.buttonContainer} onPressIn={this.goBack}>
        <Text
          style={styles.buttonText}
        >
          Previous
                </Text>
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
            rowStyle={styles.inputRow}
            icon={Icons.user}
            placeholder="Full Legal Name (First and Last Only)"
            onChange={(name) => this.setState({ name })}
            value={this.state.name}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.envelope}
            placeholder="Email"
            keyboard="email-address"
            onChange={(email) => this.setState({ email })}
            value={this.state.email}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.lock}
            placeholder="Password"
            secure={true}
            onChange={(password) => this.setState({ password })}
            value={this.state.password}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.lock}
            placeholder="Confirm Password"
            secure={true}
            onChange={(confirmPass) => this.setState({ confirmPass })}
            value={this.state.confirmPass}
          />
          <TextField 
            rowStyle={styles.inputRow}
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
              {gyms.map(function (gym, index) {
                return (<Picker.Item label={gym.name} value={index} key={gym.key} />);
              })}
            </Picker>
          </View>
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.dollar}
            placeholder="Rate ($ hourly)"
            keyboard="number-pad"
            onChange={(rate) => this.setState({ rate })}
            value={this.state.rate}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.info}
            multiline={true}
            placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
            onChange={(bio) => this.setState({ bio })}
            value={this.state.bio}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.vcard}
            placeholder="Certifications"
            onChange={(cert) => this.setState({ cert })}
            value={this.state.cert}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.user}
            placeholder="SSN (For Stripe Account)"
            keyboard="number-pad"
            onChange={(ssn) => this.setState({ ssn })}
            value={this.state.ssn}
          />
          <TextField 
            rowStyle={styles.inputRow}
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
            rowStyle={styles.inputRow}
            icon={Icons.envelope}
            placeholder="Address"
            onChange={(address) => this.setState({ address })}
            value={this.state.address}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.map}
            placeholder="City"
            onChange={(city) => this.setState({ city })}
            value={this.state.city}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.mapMarker}
            placeholder="Zip Code"
            keyboard="number-pad"
            onChange={(zip) => this.setState({ zip })}
            value={this.state.zip}
          />
          <TextField 
            rowStyle={styles.inputRow}
            icon={Icons.map}
            placeholder="State (Abbreviation eg. CA)"
            onChange={(state) => this.setState({ state })}
            value={this.state.state}
          />
        </View>
      );
    } else {
      nextButton = null;
      if (image != 'null') {
        page4 = (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.imageHolder} />
            <TouchableOpacity style={styles.pictureButton} onPressIn={this.pickImage}>
              <Text style={styles.buttonText}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
            </TouchableOpacity>
          </View>);
      } else {
        page4 = (
          <View style={styles.imageContainer}>
            <View style={styles.imageHolder}>
              <TouchableOpacity style={styles.pictureButton} onPressIn={this.pickImage}>
                <Text style={styles.pictureIcon}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
              </TouchableOpacity>
            </View>
          </View>);
      }

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
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {page1}
        {page2}
        {page3}
        {page4}
        {prevButton}
        {nextButton}
        {submitButton}
        {agreement}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
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
    width: 200,
    marginTop: 5,
  },
  pictureButton: {
    backgroundColor: COLORS.SECONDARY,
    width: 40,
    height: 40,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pictureIcon: {
    color: '#f6f5f5',
    fontSize: 30,
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
    borderColor: COLORS.SECONDARY,
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