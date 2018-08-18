import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, DatePickerIOS, Picker} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { AppLoading} from 'expo';

export class BookModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: 'null',
			bookDate: new Date(),
			bookDuration: '60',
			user: 'null',
		};
		this.bookTrainer=this.bookTrainer.bind(this);
		this.loadTrainer=this.loadTrainer.bind(this);
	}

	componentDidMount(){
		this.loadTrainer(this.props.trainer.key);

		//Get user info for state
	    var user = firebase.auth().currentUser;
	    var usersRef = firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	this.setState({user: snapshot.val()});
	    }.bind(this));
	}

	//Loads selected trainer Info from db
	loadTrainer(trainerKey){
	    firebase.database().ref('/users/' + trainerKey).once('value', function(snapshot){
	    console.log(snapshot.val());
        this.setState({
          trainer: snapshot.val()
        });
      }.bind(this));
  	}

  	//book a session with a trainer
  	bookTrainer(){
	    var user = firebase.auth().currentUser;
	    var pendingRef = firebase.database().ref('pendingSessions');

	    if(user.uid == this.state.trainer.key){
	  
	      Alert.alert('You cannot book yourself as a Trainer!');
	      return;

	    }else if(this.state.trainer.active == false){
	      
	      Alert.alert('Sorry, this trainer is no longer active.');
	      return;

	    }else{
	      Alert.alert(
	      'Are you sure you want to book this session?',
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: () => {
	          pendingRef.child(user.uid).set({
	          trainee: user.uid,
	          traineeName: this.state.user.name,
	          trainer: this.props.trainer.key,
	          trainerName: this.state.trainer.name,
	          start: this.state.bookDate.toString(),
	          duration: this.state.bookDuration,
	          location: this.props.gym.location,
	          rate: this.state.trainer.rate,
	          read: false,
	          });
	          Alert.alert('Session Booked');
	        }},
	      ]);
	    }
  	}

	render(){
		if(this.state.trainer == 'null' || typeof this.state.trainer.name === 'undefined'){
			return <Expo.AppLoading />
		}else{
			return(
				<View style={styles.modal}>
		            <Text style={styles.hourDetails}>Book Trainer: {this.state.trainer.name}</Text>
		            <Text style={styles.bookDetails}>Certifications: {this.state.trainer.cert}</Text>
		            <Text style={styles.bookDetails}>Bio: {this.state.trainer.bio}</Text>
		            <Text style={styles.bookDetails}>Gym: {this.props.gym.name}</Text>
		            <View style={styles.formContainer}>
		              <Text style ={styles.bookFormLabel}>Session Date & Time</Text>
		              <DatePickerIOS
		                mode='time'
		                minimumDate={new Date()}
		                style={{width: '65%', height: 150}}
		                itemStyle={{height: 150}}
		                date={this.state.bookDate}
		                onDateChange={(bookDate) => this.setState({bookDate: bookDate})}
		              />
		            </View>
		            <View style={styles.formRow}>
		              <Text style ={styles.bookFormLabel}>Session Duration</Text>
		              <Picker
		                style={{width: '65%', height: 150}}
		                itemStyle={{height: 150}}
		                selectedValue={this.state.bookDuration}
		                onValueChange={(itemValue, itemIndex) => this.setState({bookDuration: itemValue})}>
		                <Picker.Item label='60' value='60' />
		                <Picker.Item label='90' value='90' />
		                <Picker.Item label='120' value='120' />
		              </Picker>
		            </View>
		            <View style={{flexDirection: 'row', justifyContent: 'center'}}>
		              <TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookTrainer()}>
		                <Text 
		                  style={styles.buttonText}
		                  >
		                  Schedule Session
		                </Text>
		              </TouchableOpacity>
		            </View>
	         	</View>)
		}
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .7,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: '#fff',
		borderRadius: 10,
	},
	bookDetails:{
    	fontSize: 20,
    	fontWeight: '500'
  	},
  	bookFormLabel: {
    	fontSize: 20,
    	fontWeight: '500',
    	width: '35%'
  	},
  	formContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	bookButton: {
    	paddingVertical: 15,
    	backgroundColor: '#C51162',
    	width: '70%',
    	marginTop: 20
  	},
  	formRow: {
  		flexDirection: 'row',
  		justifyContent: 'center',
  		alignItems: 'center',
		marginTop: 25
  	},
  	hourDetails: {
	    fontFamily: 'lato',
	    fontSize: 24,
	    color: 'black',
	    fontWeight: '400',
	    marginTop: 10,
	    marginBottom: 10
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FFFFFF',
    	fontWeight: '700'
  	}
})