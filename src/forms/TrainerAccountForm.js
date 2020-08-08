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
import CommonStyles from '../components/CommonStyles';
import profileImage from '../images/profile.png';

export default class TrainerAccountForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      change: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    const userId = firebase.auth().currentUser.uid;
    const user = await loadUser(userId);
    let image;
    try {
      image = await firebase.storage().ref().child(userId).getDownloadURL();
    } catch (error) {
      image = Image.resolveAssetSource(profileImage).uri;
    } finally {
      this.setState({
        user,
        image,
        rate: String(user.rate),
        cert: user.cert,
        specialities: user.specialities,
        bio: user.bio,
        active: user.active,
        offset: String(user.offset),
        imageUploaded: true,
      });
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
    if (!this.state.cert || !this.state.cert.length) {
      Alert.alert('Please enter your specialities!');
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
          specialities: this.state.specialities,
          rate: parseInt(this.state.rate, 10),
          bio: this.state.bio,
          active: this.state.active,
          offset: parseInt(this.state.offset, 10),
        });
      });

      // user table updated
      firebase.database().ref('users').child(userId).update({
        cert: this.state.cert,
        specialities: this.state.specialities,
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
      <View style={CommonStyles.spacedContainer}>
        <View style={CommonStyles.centeredContainer}>
          <Image source={{ uri: this.state.image }} style={styles.imageHolder} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.mediumText}>Active</Text>
          <Switch
            trackColor={Colors.Primary}
            _thumbColor={Colors.Secondary}
            style={{ marginLeft: 10 }}
            value={this.state.active}
            onValueChange={(active) => this.setState({ active, change: true })}
          />
        </View>
        {rateField}
        <TextField
          icon="vcard"
          placeholder="Certifications"
          maxLength={100}
          onChange={(cert) => this.setState({ cert, change: true })}
          value={this.state.cert}
        />
        <TextField
          icon="book"
          placeholder="Specialities"
          maxLength={100}
          onChange={(specialities) => this.setState({ specialities, change: true })}
          value={this.state.specialities}
        />
        <TextField
          icon="info"
          placeholder="Bio"
          maxLength={250}
          onChange={(bio) => this.setState({ bio, change: true })}
          value={this.state.bio}
        />
        <TextField
          icon="clock-o"
          placeholder="Offset (Minutes away from gym)"
          onChange={(offset) => this.setState({ offset, change: true })}
          value={this.state.offset}
        />
        <TouchableOpacity style={CommonStyles.fullButton} onPressIn={this.pickImage}>
          <Text style={CommonStyles.buttonText}>Update Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={CommonStyles.fullButton} onPressIn={this.updateAccount}>
          <Text style={CommonStyles.buttonText}>Save Changes</Text>
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
    margin: 10,
  },
  mediumText: {
    color: Colors.Primary,
    fontSize: 25,
    fontWeight: '500',
  },
  imageHolder: {
    width: 200,
    height: 200,
    margin: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.Primary,
  },
});
