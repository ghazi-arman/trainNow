import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Alert, Switch, Image } from 'react-native';
import firebase from 'firebase';
import { ImagePicker, Font, Permissions } from 'expo';
import { Icons } from 'react-native-fontawesome';
import COLORS from './Colors';
import TextField from './components/TextField';

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
    await Expo.Font.loadAsync({
      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
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
    const response = await fetch(uri);
    const blob = await response.blob();
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

    var user = firebase.auth().currentUser;

    // gym table updated
    const trainerRef = firebase.database().ref('/gyms/' + gym + '/trainers/' + user.uid);
    trainerRef.update({
      name: this.state.name,
      cert: this.state.cert,
      rate: this.state.rate,
      bio: this.state.bio,
      active: this.state.active
    }.bind(this));

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
      this.uploadImage(uri, user.uid);
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
            onTintColor={COLORS.PRIMARY}
            tintColor={COLORS.PRIMARY}
            thumbTintColor={COLORS.SECONDARY}
            style={{ marginLeft: 10 }}
            value={this.state.active}
            onValueChange={(active) => this.setState({ active, change: true })}
          />
        </View>
        {imageHolder}
        <TextField
          rowStyle={styles.inputRow}
          iconStyle={styles.icon}
          icon={Icons.user}
          style={styles.input}
          placeholder="Name"
          color={COLORS.PRIMARY}
          onChange={this.handleName}
          value={this.state.name}
        />
        <TextField
          rowStyle={styles.inputRow}
          iconStyle={styles.icon}
          icon={Icons.dollar}
          style={styles.input}
          placeholder="Rate"
          color={COLORS.PRIMARY}
          onChange={this.handleRate}
          value={this.state.rate}
          keyboard="number-pad"
        />
        <TextField
          rowStyle={styles.inputRow}
          iconStyle={styles.icon}
          icon={Icons.vcard}
          style={styles.input}
          placeholder="Certifications"
          color={COLORS.PRIMARY}
          onChange={this.handleCerts}
          value={this.state.cert}
        />
        <TextField
          rowStyle={styles.inputRow}
          iconStyle={styles.icon}
          icon={Icons.info}
          style={styles.input}
          placeholder="Bio"
          color={COLORS.PRIMARY}
          onChange={this.handleBio}
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
  input: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: COLORS.PRIMARY,
    width: '90%',
    color: COLORS.PRIMARY
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
  icon: {
    color: COLORS.PRIMARY,
    fontSize: 30,
    marginRight: 10,
    marginTop: 13
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