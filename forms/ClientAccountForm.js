import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import { Icons } from 'react-native-fontawesome';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
const profileImage = require('../images/profile.png');

export class ClientAccountForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      change: false
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    try {
      // pull user info and profile image from firebase
      const userId = firebase.auth().currentUser.uid;
      var user = await loadUser(userId);
      const image = await firebase.storage().ref().child(userId).getDownloadURL();
      this.setState({image, user, name: user.name, imageUploaded: true });
    } catch(error) {
      // if image is not found in firebase ignore image and load user
      if(error.code === "storage/object-not-found") {
        this.setState({ user, name: user.name, imageUploaded: true });
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
        user: this.state.user
      }
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error uploading the image.')
    }
  }

  updateAccount = () => {
    // Input validation
    if (!this.state.name || !this.state.name.length) {
      Alert.alert("Please enter a name!");
      return;
    }

    try {
      // Update info in users table
      let user = firebase.auth().currentUser;
      firebase.database().ref('users').child(user.uid).update({
        name: this.state.name,
      });

      // Upload image to firebase
      if (this.state.imageToUpload) {
        this.uploadImage(this.state.imageToUpload, user.uid);
      }
      
      this.setState({ change: false })
      Alert.alert("Updated");
    } catch(error) {
      this.bugsnagClient.metaData = {
        user: this.state.user
      }
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.user || !this.state.imageUploaded) {
      return <AppLoading />;
    }
    
    if (this.state.image) {
      imageHolder = (<Image source={{ uri: this.state.image }} style={styles.imageHolder} />);
    } else {
      imageHolder = (<Image source={profileImage} style={styles.imageHolder} />);
    }

    return (
      <View style={styles.form}>
        <View style={styles.imageContainer}>
          {imageHolder}
        </View>
        <TextField
          icon={Icons.user}
          placeholder="Name"
          onChange={(name) => this.setState({ name, change: true })}
          value={this.state.name}
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