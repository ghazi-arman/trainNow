import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Switch, Image,
} from 'react-native';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
import Constants from '../components/Constants';

const loading = require('../images/loading.gif');

export default class TrainerAccountForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      change: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    let trainer;
    try {
      const userId = firebase.auth().currentUser.uid;
      trainer = await loadUser(userId);
      const image = await firebase.storage().ref().child(userId).getDownloadURL();
      this.setState({
        image,
        trainer,
        name: trainer.name,
        rate: String(trainer.rate),
        cert: trainer.cert,
        bio: trainer.bio,
        gym: trainer.gym,
        active: trainer.active,
        offset: String(trainer.offset),
        imageUploaded: true,
      });
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        this.setState({
          trainer,
          name: trainer.name,
          rate: String(trainer.rate),
          cert: trainer.cert,
          bio: trainer.bio,
          gym: trainer.gym,
          active: trainer.active,
          offset: String(trainer.offset),
          imageUploaded: true,
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
      const result = await ImagePicker.launchImageLibraryAsync({
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
      this.bugsnagClient.metaData = {
        trainer: this.state.trainer,
      };
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.');
    }
  }

  updateAccount = async () => {
    // Input validation
    if (!this.state.name || !this.state.name.length) {
      Alert.alert('Please enter a name!');
      return;
    }
    if (!this.state.rate || !this.state.rate.length || this.state.rate.replace(/\D/g, '') < 25) {
      Alert.alert('Please enter a rate over $25!');
      return;
    }
    if (!this.state.cert || !this.state.cert.length) {
      Alert.alert('Please enter your certifications!');
      return;
    }
    if (!this.state.bio || !this.state.bio.length) {
      Alert.alert('Please enter your bio!');
      return;
    }

    if (!this.state.offset || !this.state.offset.length) {
      Alert.alert('Please enter an offset!');
      return;
    }

    try {
      const userId = firebase.auth().currentUser.uid;
      // gym table updated
      firebase.database().ref(`/gyms/${this.state.gym}/trainers/${userId}`).update({
        name: this.state.name,
        cert: this.state.cert,
        rate: parseInt(this.state.rate, 10),
        bio: this.state.bio,
        active: this.state.active,
        offset: parseInt(this.state.offset, 10),
      });

      // user table updated
      firebase.database().ref('users').child(userId).update({
        name: this.state.name,
        cert: this.state.cert,
        rate: parseInt(this.state.rate, 10),
        bio: this.state.bio,
        active: this.state.active,
        offset: parseInt(this.state.offset, 10),
      });

      // image upload
      if (this.state.imageToUpload != null) {
        this.uploadImage(this.state.imageToUpload, userId);
      }

      this.setState({ change: false });
      Alert.alert('Updated');
    } catch (error) {
      this.bugsnagClient.metaData = {
        trainer: this.state.trainer,
      };
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.trainer || !this.state.imageUploaded) {
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
    }

    let rateField = null;
    if (this.state.trainer.trainerType === Constants.independentType) {
      rateField = (
        <TextField
          icon="dollar"
          placeholder="Rate"
          onChange={(rate) => this.setState({ rate, change: true })}
          value={this.state.rate}
          keyboard="number-pad"
        />
      );
    }

    return (
      <View style={styles.container}>
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
          <Image source={{ uri: this.state.image }} style={styles.imageHolder} />
        </View>
        <TextField
          icon="user"
          placeholder="Name"
          onChange={(name) => this.setState({ name, change: true })}
          value={this.state.name}
        />
        {rateField}
        <TextField
          icon="vcard"
          placeholder="Certifications"
          onChange={(cert) => this.setState({ cert, change: true })}
          value={this.state.cert}
        />
        <TextField
          icon="info"
          placeholder="Bio"
          onChange={(bio) => this.setState({ bio, change: true })}
          value={this.state.bio}
        />
        <TextField
          icon="clock-o"
          placeholder="Offset (Minutes away from gym)"
          onChange={(offset) => this.setState({ offset, change: true })}
          value={this.state.offset}
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
  container: {
    flex: 1,
    width: '95%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  switchRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  buttonContainer: {
    borderRadius: 5,
    width: 200,
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    marginTop: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  hints: {
    color: COLORS.PRIMARY,
    fontSize: 25,
    fontWeight: '500',
  },
  imageContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHolder: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
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
