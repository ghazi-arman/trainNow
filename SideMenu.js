import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, Alert} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Font } from 'expo';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';

export class SideMenu extends Component {
	
	constructor(props) {
		super(props);
    this.state = {
      fontLoaded: false,
      trainer: false,
      active: false,
      name:'',
      rate:'',
      bio:'',
      cert:'',
      gym: '',
      user: {},
    }
	}

	componentDidMount(){
		Font.loadAsync({
  		FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
  		fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
  		lato: require('./fonts/Lato/Lato-Regular.ttf'),
  		latoBold: require('./fonts/Lato/Lato-Bold.ttf')
  	});
    //pull user from database and check if trainer
    let usersRef = firebase.database().ref('users');
    var user = firebase.auth().currentUser;
    if(user){
      usersRef.orderByKey().equalTo(user.uid).once("child_added", function(snapshot) {
        var currentUser = snapshot.val();
        var trainerState = currentUser.trainer;
        this.setState({ trainer: trainerState,
                  user: currentUser,
                  name: currentUser.name,
                  rate: currentUser.rate,
                  cert: currentUser.cert,
                  bio: currentUser.bio,
                  gym: currentUser.gym,
                  rating: currentUser.rating,
                  active: currentUser.active });
    }.bind(this));
    }
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
	return(
		<View style={styles.container}>
      <View style={styles.nameContainer}>
        <Text style={{fontSize: 30, color: '#FAFAFA'}}>{this.state.name}</Text>
        <Text style={{fontSize: 20, color: '#FAFAFA'}}>Rating: {this.state.rating}</Text>
      </View>
      <TouchableOpacity onPress={() => Actions.map()}>
        <Text style={styles.menuLink}>
            <FontAwesome>{Icons.compass}</FontAwesome> Map
        </Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.menuLink} onPress={() => Actions.account()}>
            <FontAwesome>{Icons.user}</FontAwesome> Settings
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Actions.modal()}>
        <Text style={styles.menuLink}>
            <FontAwesome>{Icons.calendar}</FontAwesome> Calendar
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Actions.history()}>
        <Text style={styles.menuLink}>
            <FontAwesome>{Icons.list}</FontAwesome> History
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={this.logout}>
        <Text style={styles.menuLink}>
          <FontAwesome>{Icons.powerOff}</FontAwesome> Sign Out
        </Text>
      </TouchableOpacity>
    </View>
		)
	}
}

const styles = StyleSheet.create({
	container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 40,
    paddingLeft: 10,
    backgroundColor: '#252a34'
	},
  nameContainer: {
    height: 100,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#08d9d6',
    padding: 15
  },
  menuLink:{
    fontSize: 30,
    color: '#08d9d6',
    padding: 10
  }
});
