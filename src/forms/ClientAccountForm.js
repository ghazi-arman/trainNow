import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert, Image,
} from 'react-native';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import { loadUser } from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';
import profileImage from '../images/profile.png';

export default class ClientAccountForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      change: false,
      pressed: false,
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
      this.setState({ image, user, imageUploaded: true });
    }
  }

  pickImage = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
    if (status === 'granted') {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });

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

  updateAccount = () => {
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });

    try {
      // Update info in users table
      const user = firebase.auth().currentUser;
      // Upload image to firebase
      if (this.state.imageToUpload) {
        this.uploadImage(this.state.imageToUpload, user.uid);
      }
      this.setState({ change: false, pressed: false });
      Alert.alert('Updated');
    } catch (error) {
      this.bugsnagClient.metaData = {
        user: this.state.user,
      };
      this.bugsnagClient.notify(error);
      this.setState({ pressed: false });
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.user || !this.state.imageUploaded || this.state.pressed) {
      return <LoadingWheel />;
    }

    return (
      <View style={MasterStyles.spacedContainer}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: this.state.image }} style={styles.imageHolder} />
        </View>
        <TouchableOpacity style={styles.button} onPressIn={this.pickImage}>
          <Text style={styles.buttonText}> Update Image </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPressIn={this.updateAccount}>
          <Text style={styles.buttonText}> Save Changes </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 5,
    width: '80%',
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    marginTop: 10,
  },
  buttonText: {
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
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.Primary,
  },
});
