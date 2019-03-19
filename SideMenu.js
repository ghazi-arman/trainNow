import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, Alert} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Font, AppLoading } from 'expo';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';

export class SideMenu extends Component {
	
	constructor(props) {
		super(props);
    this.state = {
      name:'',
      rating:'',
      trainerState: 'null'
    }
	}

	componentDidMount(){
		Font.loadAsync({
  		FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
  		fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
  	});
    //pull user from database and check if trainer
    let usersRef = firebase.database().ref('users');
    var user = firebase.auth().currentUser;
    if(user){
      usersRef.orderByKey().equalTo(user.uid).once("child_added", function(snapshot) {
        var currentUser = snapshot.val();
        var trainerState = currentUser.trainer;
        this.setState({ 
          trainerState: trainerState,
          name: currentUser.name,
          rating: currentUser.rating,
        });
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
    if(this.state.trainerState == 'null'){
      return <Expo.AppLoading />
    }else{
      var clientLink;
      if(this.state.trainerState){
        clientLink = (
          <TouchableOpacity onPress={() => Actions.clients()}>
            <Text style={styles.menuLink}>
                <FontAwesome>{Icons.users}</FontAwesome> Clients
            </Text>
          </TouchableOpacity>
        );
      }else{
        clientLink = (
          <TouchableOpacity onPress={() => Actions.trainers()}>
            <Text style={styles.menuLink}>
                <FontAwesome>{Icons.users}</FontAwesome> Trainers
            </Text>
          </TouchableOpacity>
        );
      }
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
          {clientLink}
          <TouchableOpacity onPress={() => Actions.payment()}>
            <Text style={styles.menuLink}>
              <FontAwesome>{Icons.creditCard}</FontAwesome> Payments
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
