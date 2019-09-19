import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Font } from 'expo';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
const profileImage = require('../images/profile.png');
import COLORS from './Colors';

export class SideMenu extends Component {
	
	constructor(props) {
		super(props);
    this.state = {
      name:'',
      rating:'',
      trainerState: 'null',
      image: 'null',
      active: ''
    }
	}

	componentDidMount(){
		Font.loadAsync({
  		FontAwesome: require('../fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
  		fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
  	});
    //pull user from database and check if trainer
    let userId = firebase.auth().currentUser.uid;
    let usersRef = firebase.database().ref(`/users/${userId}`);
    usersRef.once("value", function(snapshot) {
      var currentUser = snapshot.val();
      var trainerState = currentUser.trainer;
      var active;
      if(trainerState){
        active = currentUser.active;
      }
      firebase.storage().ref().child(userId).getDownloadURL().then(function(url){
        this.setState({
          image: url,
          trainerState: trainerState,
          name: currentUser.name,
          rating: currentUser.rating,
          active: active,
        });
      }.bind(this), function(error){
        this.setState({
          trainerState: trainerState,
          name: currentUser.name,
          rating: currentUser.rating,
          active: active
        });
      }.bind(this));
    }.bind(this));
	}

    // user log out confirm
  logout() {
    Alert.alert(
      "Are you sure you wish to sign out?", 
      "",
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          firebase.auth().signOut().then(function() {
            Actions.reset('login');
          }, function(error) {
            Alert.alert('Sign Out Error', error);
          });
        }},
      ],
    );
  }

	render(){
    if(this.state.trainerState == 'null'){
      return <Expo.AppLoading />
    }else{
      var clientLink;
      var active;
      if(this.state.trainerState){
        clientLink = (
          <TouchableOpacity onPress={() => Actions.ClientPage()}>
            <Text style={styles.icon}>
                <FontAwesome>{Icons.users}</FontAwesome> <Text style={styles.menuLink}> Clients</Text>
            </Text>
          </TouchableOpacity>
        );
        if(this.state.active){
          active = (<Text style={{fontSize: 20, color: COLORS.WHITE}}>Active</Text>);
        }else{
          active = (<Text style={{fontSize: 20, color: COLORS.RED}}>Away</Text>)
        }
      }else{
        clientLink = (
          <TouchableOpacity onPress={() => Actions.TrainerPage()}>
            <Text style={styles.icon}>
                <FontAwesome>{Icons.users}</FontAwesome> <Text style={styles.menuLink}> Trainers</Text>
            </Text>
          </TouchableOpacity>
        );
      }
      if(this.state.image != 'null'){
        var imageHolder = (<View style={styles.imageContainer}><Image style={styles.image} source={{ uri: this.state.image }} /></View>);
      }else{
        var imageHolder = (<View style={styles.imageContainer}><Image style={styles.image} source={profileImage} /></View>);
      }
    	return(
    		<View style={styles.container}>
          <View style={styles.nameContainer}>
            {imageHolder}
            <View style={styles.infoContainer}>
              <Text style={{fontSize: 25, color: COLORS.WHITE}}>{this.state.name}</Text>
              <Text style={{fontSize: 20, color: COLORS.WHITE}}>Rating: {this.state.rating}</Text>
              {active}
            </View>
          </View>
          <TouchableOpacity onPress={() => Actions.MapPage()}>
            <Text style={styles.icon}>
                <FontAwesome>{Icons.compass}</FontAwesome> <Text style={styles.menuLink}> Map</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.icon} onPress={() => Actions.AccountPage({trainer: this.state.trainerState})}>
                <FontAwesome>{Icons.gear}</FontAwesome> <Text style={styles.menuLink}> Settings</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Actions.SchedulePage()}>
            <Text style={styles.icon}>
                <FontAwesome>{Icons.calendar}</FontAwesome> <Text style={styles.menuLink}> Calendar</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Actions.HistoryPage()}>
            <Text style={styles.icon}>
                <FontAwesome>{Icons.list}</FontAwesome> <Text style={styles.menuLink}> History</Text>
            </Text>
          </TouchableOpacity>
          {clientLink}
          <TouchableOpacity onPress={() => Actions.PaymentPage()}>
            <Text style={styles.icon}>
              <FontAwesome>{Icons.creditCard}</FontAwesome> <Text style={styles.menuLink}> Payments</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.logout}>
            <Text style={styles.icon}>
              <FontAwesome>{Icons.powerOff}</FontAwesome> <Text style={styles.menuLink}> Sign Out</Text>
            </Text>
          </TouchableOpacity>
        </View>
    		)
    }
	}
}

const styles = StyleSheet.create({
	container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WHITE
	},
  nameContainer: {
    height: 140,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY,
    padding: 15,
    paddingTop: 40
  },
  infoContainer: {
    height: 100,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 15,
  },
  icon:{
    fontSize: 30,
    color: COLORS.PRIMARY,
    marginLeft: 10,
    padding: 10
  },
  menuLink:{
    fontSize: 30,
    color: COLORS.PRIMARY
  },
  imageContainer: {
    height: 80,
    width: 80,
    borderRadius: 40
  },
  image: {
    height: 80,
    width: 80,
    borderRadius: 40
  }
});
