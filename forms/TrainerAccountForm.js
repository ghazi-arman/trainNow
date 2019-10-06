import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Switch, Image } from 'react-native';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import { AppLoading } from 'expo';
import { Icons } from 'react-native-fontawesome';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
const profileImage = require('../images/profile.png');

export class TrainerAccountForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      change: false
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    try {
      const userId = firebase.auth().currentUser.uid;
      var trainer = await loadUser(userId);
      const image = await firebase.storage().ref().child(userId).getDownloadURL();
      this.setState({ 
        image,
        trainer,
        name: trainer.name,
        rate: trainer.rate,
        cert: trainer.cert,
        bio: trainer.bio,
        gym: trainer.gym,
        active: trainer.active,
        imageUploaded: true
      });
    } catch(error) {
      if(error.code === "storage/object-not-found") {
        this.setState({ 
          trainer,
          name: trainer.name,
          rate: trainer.rate,
          cert: trainer.cert,
          bio: trainer.bio,
          gym: trainer.gym,
          active: trainer.active,
          imageUploaded: true 
        });
        return;
      }
      this.bugsnagClient.notify(error);
    }
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
        this.setState({ imageToUpload: result.uri, image: result.uri, change: true });
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
      this.bugsnagClient.metaData = {
        trainer: this.state.trainer
      }
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.')
    }
  }

  updateAccount = async() => {
    // Input validation
    if (!this.state.name || !this.state.name.length) {
      Alert.alert("Please enter a name!");
      return;
    }
    if (!this.state.rate || !this.state.rate.length) {
      Alert.alert("Please enter a rate!");
      return;
    }
    if (!this.state.cert || !this.state.cert.length) {
      Alert.alert("Please enter your certifications!");
      return;
    }
    if (!this.state.bio || !this.state.bio.length) {
      Alert.alert("Please enter your bio!");
      return;
    }

    try {
      const userId = firebase.auth().currentUser.uid;
      // gym table updated
      firebase.database().ref(`/gyms/${this.state.gym}/trainers/${userId}`).update({
        name: this.state.name,
        cert: this.state.cert,
        rate: this.state.rate,
        bio: this.state.bio,
        active: this.state.active
      });

      // user table updated
      firebase.database().ref('users').child(userId).update({
        name: this.state.name,
        cert: this.state.cert,
        rate: this.state.rate,
        bio: this.state.bio,
        gym: this.state.gym,
        active: this.state.active
      });

      // image upload
      if (this.state.imageToUpload != null) {
        this.uploadImage(this.state.imageToUpload, userId);
      }

      this.setState({ change: false })
      Alert.alert("Updated");
    } catch(error) {
      this.bugsnagClient.metaData = {
        trainer: this.state.trainer
      }
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.trainer || !this.state.imageUploaded) {
      return <AppLoading />;
    }

    if (this.state.image) {
      imageHolder = (<Image source={{ uri: this.state.image }} style={styles.imageHolder} />);
    } else {
      imageHolder = (<Image source={profileImage} style={styles.imageHolder} />);
    }

    return (
      <View style={styles.form}>
        <View style={styles.switchRow}>
          <Text style={styles.hints}>Active? </Text>
          <Switch
            trackColor={COLORS.PRIMARY}
            _thumbColor={COLORS.SECONDARY}
            style={{ marginLeft: 10 }}
            value={this.state.active}
            onValueChange={(active) => this.setState({ active, change: true })}
          />
        </View>
        <View style={styles.imageContainer}>
          {imageHolder}
        </View>
        <TextField
          icon={Icons.user}
          placeholder="Name"
          onChange={(name) => this.setState({ name, change: true })}
          value={this.state.name}
        />
        <TextField
          icon={Icons.dollar}
          placeholder="Rate"
          onChange={(rate) => this.setState({ rate, change: true })}
          value={this.state.rate}
          keyboard="number-pad"
        />
        <TextField
          icon={Icons.vcard}
          placeholder="Certifications"
          onChange={(cert) => this.setState({ cert, change: true })}
          value={this.state.cert}
        />
        <TextField
          icon={Icons.info}
          placeholder="Bio"
          onChange={(bio) => this.setState({ bio, change: true })}
          value={this.state.bio}
        />
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.pickImage}>
          <Text style={styles.buttonText}> Update Image </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.updateAccount}>
          <Text style={styles.buttonText}> Save Changes </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  form: {
    padding: 20
  },
  switchRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5
  },
  buttonContainer: {
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    marginTop: 10
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  hints: {
    color: COLORS.PRIMARY,
    fontSize: 25,
    fontWeight: "500"
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
    borderColor: COLORS.PRIMARY,
  },
});