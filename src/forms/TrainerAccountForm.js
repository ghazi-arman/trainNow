import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Switch, Image,
} from 'react-native';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
import Constants from '../components/Constants';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class TrainerAccountForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      change: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    let user;
    try {
      const userId = firebase.auth().currentUser.uid;
      user = await loadUser(userId);
      const image = await firebase.storage().ref().child(userId).getDownloadURL();
      this.setState({
        image,
        user,
        rate: String(user.rate),
        cert: user.cert,
        bio: user.bio,
        active: user.active,
        offset: String(user.offset),
        imageUploaded: true,
      });
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        this.setState({
          user,
          rate: String(user.rate),
          cert: user.cert,
          bio: user.bio,
          active: user.active,
          offset: String(user.offset),
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
        user: this.state.user,
      };
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.');
    }
  }

  updateAccount = async () => {
    if (!this.state.rate || !this.state.rate.length || parseInt(this.state.rate, 10) < 25) {
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
      Object.keys(this.state.user.gyms).forEach((gymKey) => {
        firebase.database().ref(`/gyms/${gymKey}/trainers/${userId}`).update({
          cert: this.state.cert,
          rate: parseInt(this.state.rate, 10),
          bio: this.state.bio,
          active: this.state.active,
          offset: parseInt(this.state.offset, 10),
        });
      });

      // user table updated
      firebase.database().ref('users').child(userId).update({
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
        user: this.state.user,
      };
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.user || !this.state.imageUploaded) {
      return <LoadingWheel />;
    }

    let rateField = null;
    if (this.state.user.trainerType === Constants.independentType) {
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
      <View style={MasterStyles.spacedContainer}>
        <View style={styles.switchRow}>
          <Text style={styles.hints}>Active? </Text>
          <Switch
            trackColor={Colors.Primary}
            _thumbColor={Colors.Secondary}
            style={{ marginLeft: 10 }}
            value={this.state.active}
            onValueChange={(active) => this.setState({ active, change: true })}
          />
        </View>
        <View style={styles.imageContainer}>
          <Image source={{ uri: this.state.image }} style={styles.imageHolder} />
        </View>
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
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    marginTop: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.White,
    fontWeight: '700',
  },
  hints: {
    color: Colors.Primary,
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
    borderColor: Colors.Primary,
  },
});
