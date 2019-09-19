import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Alert, Switch, Image } from 'react-native';
import firebase from 'firebase';
import { ImagePicker, Font, Permissions } from 'expo';
import { Icons } from 'react-native-fontawesome';
import COLORS from '../components/Colors';
import TextField from '../components/TextField';

export class TrainerAccountForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      fontLoaded: false,
      image: null,
      imageToUpload: null,
      change: false
    };
    this.updateAccount = this.updateAccount.bind(this);
  }

  componentDidMount() {
    //Load Font
    if (!this.state.fontLoaded) {
      this.loadFont();
    }

    const user = firebase.auth().currentUser;

    // pull trainer image from firebase storage
    firebase.storage().ref().child(user.uid).getDownloadURL().then(function (url) {
      this.setState({ image: url });
    }.bind(this), function (error) {
      console.log(error);
    });

    // pull trainer info from users table 
    let usersRef = firebase.database().ref('users');
    usersRef.orderByKey().equalTo(user.uid).once("child_added", function (snapshot) {
      const currentUser = snapshot.val();
      this.setState({
        trainer: currentUser.trainer,
        name: currentUser.name,
        rate: currentUser.rate,
        cert: currentUser.cert,
        bio: currentUser.bio,
        gym: currentUser.gym,
        active: currentUser.active
      });
    }.bind(this));
  }

  loadFont = async () => {
    await Font.loadAsync({
      FontAwesome: require('../fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
    });

    this.setState({ fontLoaded: true });
  }

  pickImage = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);

    if (status === 'granted') {
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.cancelled) {
        this.setState({ imageToUpload: result.uri, image: result.uri, change: true });
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
        reject(new Error('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
    const ref = firebase.storage().ref().child(uid);

    const snapshot = await ref.put(blob);
    return snapshot.downloadURL;
  }

  updateAccount() {
    // input validation
    if (!this.state.name.length) {
      Alert.alert("Please enter a name!");
      return;
    }
    if (!this.state.rate.length) {
      Alert.alert("Please enter a rate!");
      return;
    }
    if (!this.state.cert.length) {
      Alert.alert("Please enter your certifications!");
      return;
    }
    if (!this.state.bio.length) {
      Alert.alert("Please enter your bio!");
      return;
    }

    let user = firebase.auth().currentUser;

    // gym table updated
    const trainerRef = firebase.database().ref('/gyms/' + this.state.gym + '/trainers/' + user.uid);
    trainerRef.update({
      name: this.state.name,
      cert: this.state.cert,
      rate: this.state.rate,
      bio: this.state.bio,
      active: this.state.active
    });

    // user table updated
    const userRef = firebase.database().ref('users');
    userRef.child(user.uid).update({
      name: this.state.name,
      cert: this.state.cert,
      rate: this.state.rate,
      bio: this.state.bio,
      gym: this.state.gym,
      active: this.state.active
    });

    // image upload
    if (this.state.imageToUpload != null) {
      this.uploadImage(this.state.imageToUpload, user.uid);
    }

    this.setState({ change: false })
    Alert.alert("Updated");
  }

  render() {
    // render appropriate image holder
    if (this.state.image != null) {
      imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: this.state.image }} style={styles.imageHolder} /></View>);
    } else {
      imageHolder = (<View style={styles.imageContainer}><View style={styles.imageHolder}></View></View>);
    }
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
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
        {imageHolder}
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.user}
          placeholder="Name"
          onChange={(name) => this.setState({ name, change: true })}
          value={this.state.name}
        />
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.dollar}
          placeholder="Rate"
          onChange={(rate) => this.setState({ rate, change: true })}
          value={this.state.rate}
          keyboard="number-pad"
        />
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.vcard}
          placeholder="Certifications"
          onChange={(cert) => this.setState({ cert, change: true })}
          value={this.state.cert}
        />
        <TextField
          rowStyle={styles.inputRow}
          icon={Icons.info}
          placeholder="Bio"
          onChange={(bio) => this.setState({ bio, change: true })}
          value={this.state.bio}
        />
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.pickImage}>
          <Text style={styles.buttonText}>
            Update Image
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.updateAccount}>
          <Text style={styles.buttonText}>
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20
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