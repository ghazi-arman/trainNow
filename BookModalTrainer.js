import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, DatePickerIOS, Picker} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { AppLoading} from 'expo';
import COLORS from './Colors';

export class BookModalTrainer extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			client: 'null',
			bookDate: new Date(),
			bookDuration: '60',
			user: 'null',
			gym: 'null'
		};
		this.bookClient=this.bookClient.bind(this);
		this.loadClient=this.loadClient.bind(this);
		this.loadGym=this.loadGym.bind(this);
	}

	async componentDidMount(){
		var client = await this.loadClient(this.props.client);
		var gym = await this.loadGym(this.props.gym);

		//Get user info for state
	    var user = firebase.auth().currentUser;
	    var usersRef = firebase.database().ref('users');
	    await usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	this.setState({user: snapshot.val(), gym: gym, client: client});
	    }.bind(this));
	}

	async loadClient(clientKey){
		var client;
	    await firebase.database().ref('users').child(clientKey).once('value', function(snapshot){
        	client = snapshot.val();
      	}.bind(this));
	    return client;
  	}

  	async loadGym(gymKey){
  		var gym;
  		await firebase.database().ref('gyms').child(gymKey).once('value', function(snapshot){
  			gym = snapshot.val()
  		}.bind(this));
  		return gym;
  	}

  	//Convert date to readable format
  	dateToString(start){
	    var pendingDate = new Date(start);
	    var month = pendingDate.getMonth() + 1;
	    var day = pendingDate.getDate();
	    var hour = pendingDate.getHours();
	    var minute = pendingDate.getMinutes();
	    var abbr;

	    if(minute < 10){
	        minute = '0' + minute;
	    }
	    //Sets abbr to AM or PM
	    if(hour > 12){
	      hour = hour - 12;
	      abbr = 'PM';
	    }else{
	      abbr = 'AM'
	    }

	    var displayDate = month + '-' + day + ' ' + hour + ':' + minute + abbr;
	    return displayDate;
	 }

  	//book a session with a trainer
  	async bookClient(){
	    var user = firebase.auth().currentUser;
	    var pendingRef = firebase.database().ref('pendingSessions');
	    var trainRef = firebase.database().ref('trainSessions');
	    var price = (parseInt(this.state.user.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);

	    if(!this.state.user.cardAdded && !this.state.user.type == 'managed'){
	    	Alert.alert('This trainer no longer has a card on file.');
	    	return;
	    }

    	//Pull session for trainer to be booked and trainee to check for time conflicts
    	var user = firebase.auth().currentUser;
    	var sessions = [];
    	const trainerSessions = await trainRef.orderByChild('trainer').equalTo(user.uid).once('value', function(snapshot){
    		snapshot.forEach(function(child){
    			sessions.push(child.val());
    		});
    	}.bind(this));

    	const userSessions = await trainRef.orderByChild('trainee').equalTo(this.props.client).once('value', function(snapshot){
    		snapshot.forEach(function(child){
    			sessions.push(child.val());
    		});
    	});

		for(i = 0; i < sessions.length; i++){
    		var session = sessions[i];
    		var start2 = new Date(session.start).getTime();
    		var end2 = new Date(new Date(session.start).getTime() + (60000 * session.duration)).getTime();
    		var start1 = new Date(this.state.bookDate).getTime();
    		var end1 = new Date(new Date(this.state.bookDate).getTime() + (60000 * this.state.bookDuration)).getTime();

    		if(start1 > start2 && start1 < end2 || start2 > start1 && start2 < end1){
    			if(session.trainee == user.uid){
    				Alert.alert(this.state.client.name + 'has a session at ' + this.dateToString(session.start) + ' for ' + session.duration + ' mins.');
    				return;
    			}else{
    				Alert.alert('You has a session at ' + this.dateToString(session.start) + ' for ' + session.duration + ' mins.');
    				return;
    			}
    		}
    	}

		Alert.alert(
	      'Request session with ' + this.state.client.name + ' for $' + price + ' at ' + this.dateToString(this.state.bookDate),
	      '',
	     	[
        	{text: 'No'},
        	{text: 'Yes', onPress: async () => {
         	pendingRef.push({
	          	trainee: this.props.client,
	          	traineeName: this.state.client.name,
	          	trainer: user.uid,
	          	trainerName: this.state.user.name,
	          	start: this.state.bookDate.toString(),
	          	duration: this.state.bookDuration,
	          	location: this.state.gym.location,
	          	gym: this.state.gym.name,
	          	rate: this.state.user.rate,
	          	read: false,
	          	traineeStripe: this.state.client.stripeId,
	          	trainerStripe: this.state.user.stripeId,
	          	traineePhone: this.state.client.phone,
	          	trainerPhone: this.state.user.phone,
	          	sentBy: 'trainer'
         	});
         	try {
	    	  var message = this.state.user.name + " has requested a session at " + this.dateToString(this.state.bookDate) + " for " + this.state.bookDuration + " mins.";
		      const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/twilio/sendMessage/', {
		        method: 'POST',
		        body: JSON.stringify({
		          phone: this.state.client.phone,
		          message: message
		        }),
		      });
		      const data = await res.json();
		      data.body = JSON.parse(data.body);
		    } catch(error){
		      console.log(error);
		    }
         	this.props.hide();
         	setTimeout(this.props.confirm, 1000);
        }},
      	]);
  	}

	render(){
		if(this.state.client == 'null' || this.state.client == null || this.state.gym == 'null'){
			return <Expo.AppLoading />
		}else{
			return(
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
	              		<Text style={styles.trainerName}>{this.state.client.name}</Text>
	            	</View>
					<View style={styles.formContainer}>
			            <Text style={styles.bookDetails}>{this.state.gym.name}</Text>
			            <View style={styles.inputRow}>
			            <Text style ={styles.bookFormLabel}>Session Time</Text>
			            <View style={styles.datePickerHolder}>
				            <DatePickerIOS
				                mode='time'
				                itemStyle={{color: COLORS.PRIMARY}}
				                textColor={COLORS.PRIMARY}
				                style={styles.datepicker}
				                minuteInterval={5}
				                minimumDate={new Date(new Date().getTime())}
				                date={this.state.bookDate}
				                onDateChange={(bookDate) => this.setState({bookDate: bookDate})}
				              />
				            </View>
				        </View>
			            <View style={styles.inputRow}>
			              <Text style ={styles.bookFormLabel}>Session Duration</Text>
			              <Picker
			                style={styles.picker}
			                itemStyle={{height: 70, color: COLORS.PRIMARY}}
			                selectedValue={this.state.bookDuration}
			                onValueChange={(itemValue, itemIndex) => this.setState({bookDuration: itemValue})}>
			                <Picker.Item label='60' value='60' />
			                <Picker.Item label='90' value='90' />
			                <Picker.Item label='120' value='120' />
			              </Picker>
			            </View>
			            <TouchableOpacity style={styles.bookButton} onPressIn={() => this.bookClient()}>
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
		flex: .9,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	trainerName: {
    	fontSize: 30,
    	color: COLORS.WHITE,
    	fontWeight: '500'
  	},
	nameContainer: {
	    height: '12%',
	    width: '100%',
	    borderTopLeftRadius: 10,
	    borderTopRightRadius: 10,
	    backgroundColor: COLORS.PRIMARY,
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
	bookDetails:{
    	fontSize: 20,
    	fontWeight: '500',
    	color: COLORS.PRIMARY
  	},
  	bookFormLabel: {
    	fontSize: 20,
    	fontWeight: '500',
    	width: '33%',
    	textAlign: 'center',
    	color: COLORS.PRIMARY
  	},
  	formContainer: {
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '95%',
		height: '85%'
	},
	datePickerHolder: {
		height: 200,
		width: '65%',
	},
	datepicker: {
		height: 200,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
	},
	picker: {
		height: 70,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		width: '65%',
	},
	bookButton: {
    	paddingVertical: 15,
    	backgroundColor: COLORS.SECONDARY,
    	width: '70%',
    	marginTop: 10
  	},
  	inputRow: {
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 10
	},
  	buttonText: {
    	textAlign: 'center',
    	color: COLORS.WHITE,
    	fontWeight: '700'
  	}
})