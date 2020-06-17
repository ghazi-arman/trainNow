import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking, Image } from 'react-native';
import MapView from 'react-native-maps';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
import { getLocation, loadGroupSession, dateToString, startGroupSession } from '../components/Functions';
const loading = require('../images/loading.gif');

export class GroupSessionPage extends Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    this._interval = setInterval(async () => {
      try {
        const location = await getLocation();
        const session = await loadGroupSession(this.props.session);
        // if session has been ended redirect to rating page
        if (session.end) {
          clearInterval(this._interval);
          Actions.GroupSessionRatingPage({session: session.key});
        }
        this.setState({ session, userRegion: location, mapRegion: location });
      } catch(error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error when trying to load the current session.');
        this.goToMap();
      }
    }, 1000);
  }

  componentWillUnmount() {
    clearInterval(this._interval);
  }
  
  startSession = () => {
    startGroupSession(this.state.session.key, this.state.userRegion);
  }
  
  endSession = async() => {
    const sessionRef = firebase.database().ref(`/groupSessions/${this.state.session.key}`);
    const gymSessionRef = firebase.database().ref(`/gyms/${this.state.session.gymKey}/groupSessions/${this.state.session.key}`);
    sessionRef.update({end: new Date()});
    gymSessionRef.update({ end: new Date()});
    clearInterval(this._interval);
    Actions.GroupSessionRatingPage({session: this.state.session.key});
  }

  openMaps = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL(`https://maps.apple.com/?ll=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${this.state.session.location.latitude},${this.state.session.location.longitude}`);
    }
  }

  sendMessage = () => {
    Linking.openURL(`sms:${this.state.session.trainerPhone}`);
  }

  goToMap = () => Actions.reset('MapPage');

  render() {
    if (!this.state.session || !this.state.userRegion) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }

    var displayDate = dateToString(this.state.session.start);

    var map, button, mapButton, time, minutes, remaining, ready, textButton;
    var user = firebase.auth().currentUser;

    if(this.state.session.trainer === user.uid){
      description = <Text style={styles.bookDetails}>You are hosting the {this.state.session.name} class</Text>;
    }else{
      textButton = (
        <TouchableOpacity
        style={styles.buttonContainer}
        onPress={this.sendMessage}
        >
          <Text style={styles.buttonText}> Send Message </Text>
        </TouchableOpacity>
      );
      description = <Text style={styles.bookDetails}>{this.state.session.trainerName} is training you!</Text>;
    }
    mapButton = (
      <TouchableOpacity
      style={styles.buttonContainer}
      onPress={this.openMaps}
      >
        <Text style={styles.buttonText}> Open in Maps </Text>
      </TouchableOpacity>
    );

    map = ( 
      <MapView
        pitchEnabled = {false}
        rotateEnabled = {false}
        scrollEnabled = {false}
        zoomEnabled = {false}
        style={styles.mapContainer}
        region={this.state.mapRegion}
        showsUserLocation={true}
      >
        <MapView.Marker
            ref={this.state.session.trainer}
            key={this.state.session.trainer}
            coordinate={this.state.session.location}
        />
      </MapView>
    );

    if(!this.state.session.started){
      time = <Text style={styles.bookDetails}>{displayDate} </Text>;
      length = <Text style={styles.bookDetails}>{this.state.session.duration} min</Text>;
      
      if(!this.state.session.started){
        ready = <Text style={styles.smallText}>{this.state.session.trainerName} has not started the session!</Text>;
      }else {
        ready = <Text style={styles.smallText}>{this.state.session.trainerName} has started the session!</Text>
      }
      
      if(this.state.session.trainer === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity 
            style={styles.buttonContainer}
            onPress={this.startSession}>
            <Text style={styles.buttonText}> Start Session </Text>
          </TouchableOpacity>
        );
      }

    }else{
      pendingDate = new Date(this.state.session.start);
      displayDate = dateToString(this.state.session.start);
      remaining = ((pendingDate.getTime() + (this.state.session.duration * 1000 * 60)) - new Date().getTime());
      minutes = Math.max(Math.floor((remaining/1000)/60), 0);
      time = <Text style={styles.bookDetails}>{displayDate}</Text>;
      length = <Text style={styles.bookDetails}>You have {minutes} min left</Text>;
      if(this.state.session.trainer === firebase.auth().currentUser.uid) {
        button = (
          <TouchableOpacity 
            style={styles.buttonContainer}
            onPressIn={this.endSession}>
            <Text 
              style={styles.buttonText}
              >End Session</Text>
          </TouchableOpacity>
        );
      }
    }
    return (
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.goToMap}>
            <FontAwesome name="arrow-left" size={35} />
          </Text>
          <Text style={styles.header}>Your Session</Text>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.infoContainer}>
            {description}
            {time}
            {length}
            {ready}
          </View>
          {map}
          <View style={styles.buttonContain}>
            {button}
            {mapButton}
            {textButton}
          </View>
        </View>
      </View>	
    );
  }
}

const styles = StyleSheet.create({
  bookDetails:{
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.PRIMARY,
    textAlign: 'center'
  },
  smallText:{
    marginTop: 5,
    fontSize: 15,
    fontWeight: '300',
    color: COLORS.SECONDARY,
    textAlign: 'center'
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.PRIMARY
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  formContainer: {
    flex: 8,
    width: '95%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapContainer: {
    width: '95%',
    flex: 10,
  },
  buttonContain: {
    width: '50%',
    flex: 8,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },
  infoContainer: {
    height: '35%',
    width: '80%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },	
  buttonContainer: {
    borderRadius: 5,
    backgroundColor: COLORS.SECONDARY,
    paddingVertical: 15,
    width: '100%',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'center'
  },
  buttonText: {
    textAlign: 'center',
    color: COLORS.WHITE,
    fontWeight: '700'
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35, 
    color: COLORS.SECONDARY, 
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
  }
});
