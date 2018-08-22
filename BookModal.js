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
	    	pendingRef.once('value', function(snapshot){
	    		if(snapshot.hasChild(user.uid)){
	    			Alert.alert('You cannot book a session when you have one pending!');
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
	    	}.bind(this));
	   }
  	}

	render(){
		if(this.state.trainer == 'null' || typeof this.state.trainer.name === 'undefined'){
			return <Expo.AppLoading />
		}else{
			return(
				<View style={styles.modal}>
					<View style={styles.formContainer}>
			            <Text style={styles.hourDetails}>{this.state.trainer.name}</Text>
			            <Text style={styles.bookDetails}>Gym: {this.props.gym.name}</Text>
			            <View style={styles.inputRow}>
			              <Text style ={styles.bookFormLabel}>Session Time</Text>
			              <DatePickerIOS
			                mode='time'
			                style={styles.datepicker}
			                minuteInterval={10}
			                minimumDate={new Date(new Date().getTime() + 600000)}
			                date={this.state.bookDate}
			                onDateChange={(bookDate) => this.setState({bookDate: bookDate})}
			              />
			            </View>
			            <View style={styles.inputRow}>
			              <Text style ={styles.bookFormLabel}>Session Duration</Text>
			              <Picker
			                style={styles.picker}
			                itemStyle={{height: 90}}
			                selectedValue={this.state.bookDuration}
			                onValueChange={(itemValue, itemIndex) => this.setState({bookDuration: itemValue})}>
			                <Picker.Item label='60' value='60' />
			                <Picker.Item label='90' value='90' />
			                <Picker.Item label='120' value='120' />
			              </Picker>
			            </View>
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
		backgroundColor: '#E0E4CC',
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
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: '80%'
	},
	datepicker: {
		height: 200,
		width: '80%',
		borderWidth: 1,
		borderColor: '#F38630',
		marginTop: 20
	},
	picker: {
		height: 90,
		borderWidth: 1,
		borderColor: '#F38630',
		width: '80%',
	},
	bookButton: {
    	paddingVertical: 15,
    	backgroundColor: '#69D2E7',
    	width: '70%',
    	marginTop: 20
  	},
  	inputRow: {
		width: '90%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
  	hourDetails: {
	    fontFamily: 'lato',
	    fontSize: 34,
	    color: 'black',
	    fontWeight: '500',
	    marginTop: 10,
	    marginBottom: 10
  	},
  	buttonText: {
    	textAlign: 'center',
    	color: '#FFFFFF',
    	fontWeight: '700'
  	}
})