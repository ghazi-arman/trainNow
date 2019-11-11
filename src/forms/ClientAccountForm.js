import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import firebase from 'firebase';
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';
import { loadUser } from '../components/Functions';
const loading = require('../images/loading.gif');

export class ClientAccountForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      change: false,
      pressed: false
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

    if(this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });

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
      
      this.setState({ change: false, pressed: false });
      Alert.alert("Updated");
    } catch(error) {
      this.bugsnagClient.metaData = {
        user: this.state.user
      }
      this.bugsnagClient.notify(error);
      this.setState({ pressed: false });
      Alert.alert('There was an error updating your account info. Please try again.');
    }
  }

  render() {
    if (!this.state.user || !this.state.imageUploaded || this.state.pressed) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }

    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: this.state.image }} style={styles.imageHolder} />
        </View>
        <TextField
          icon="user"
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
  container: {
    flex: 1,
    width: '95%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  buttonContainer: {
    borderRadius: 5,
    width: 200,
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    marginTop: 10
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  loading: {
    width: '100%',
    resizeMode: 'contain'
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
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
});