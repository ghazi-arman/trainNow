import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import COLORS from './Colors';
import { loadUser } from './Functions';

export class ManagedSideMenu extends Component {
	
	constructor(props) {
		super(props);
    this.state = {}
	}

	async componentDidMount(){
    const user = await loadUser(firebase.auth().currentUser.uid);
    this.setState({ user });
	}

  logout() {
    Alert.alert(
      "Are you sure you wish to sign out?", 
      "",
      [
        {text: 'No'},
        {text: 'Yes', onPress: () => {
          firebase.auth().signOut().then(function() {
            Actions.reset('LoginPage');
          }, function(error) {
            Alert.alert('Sign Out Error', error);
          });
        }},
      ],
    );
  }

	render(){
    if(!this.state.user){
      return <AppLoading />
    }
    let clientLink, active;
    if(this.state.user.trainer){
      clientLink = (
        <TouchableOpacity onPress={() => Actions.ClientPage()}>
          <Text style={styles.icon}>
              <FontAwesome>{Icons.users}</FontAwesome> <Text style={styles.menuLink}> Clients</Text>
          </Text>
        </TouchableOpacity>
      );
      if(this.state.user.active){
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
    return(
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={{fontSize: 25, color: COLORS.WHITE}}>{this.state.user.name}</Text>
          <Text style={{fontSize: 20, color: COLORS.WHITE}}>Rating: {this.state.user.rating}</Text>
          {active}
        </View>
        <TouchableOpacity onPress={() => Actions.MapPage()}>
          <Text style={styles.icon}>
              <FontAwesome>{Icons.compass}</FontAwesome> <Text style={styles.menuLink}> Map</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.icon} onPress={() => Actions.SettingsPage({trainer: true})}>
              <FontAwesome>{Icons.gear}</FontAwesome> <Text style={styles.menuLink}> Settings</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Actions.CalendarPage()}>
          <Text style={styles.icon}>
              <FontAwesome>{Icons.calendar}</FontAwesome> <Text style={styles.menuLink}> Calendar</Text>
          </Text>
        </TouchableOpacity>
        {clientLink}
        <TouchableOpacity onPress={this.logout}>
          <Text style={styles.icon}>
            <FontAwesome>{Icons.powerOff}</FontAwesome> <Text style={styles.menuLink}> Sign Out</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
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
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY,
    paddingBottom: 20,
    paddingTop: 40
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
  }
});
