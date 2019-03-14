import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, DatePickerIOS, Picker} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { AppLoading} from 'expo';
console.ignoredYellowBox = ['Setting a timer'];

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
  	async bookTrainer(){
	    var user = firebase.auth().currentUser;
	    var pendingRef = firebase.database().ref('pendingSessions');
	    var trainRef = firebase.database().ref('trainSessions');
	    var price = (parseInt(this.state.trainer.rate) * (parseInt(this.state.bookDuration) / 60)).toFixed(2);

	    if(this.state.user.stripeId === undefined){
	    	Alert.alert('You must have a card on file to book a session.');
	    	return;
	    }

	    if(user.uid == this.state.trainer.key){
	      Alert.alert('You cannot book yourself as a Trainer!');
	      return;

	    }else if(this.state.trainer.active == false){
	      
	      Alert.alert('Sorry, this trainer is no longer active.');
	      return;

	    }else{
	    	//Pull session for trainer to be booked and trainee to check for time conflicts
	    	var sessions = [];
	    	const trainerSessions = await trainRef.orderByChild('trainer').equalTo(this.props.trainer.key).once('value', function(snapshot){
	    		snapshot.forEach(function(child){
	    			sessions.push(child.val());
	    		});
	    	}.bind(this));

	    	const userSessions = await trainRef.orderByChild('trainee').equalTo(user.uid).once('value', function(snapshot){
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
	    				Alert.alert('You have a session at ' + this.dateToString(session.start) + ' for ' + session.duration + ' mins.');
	    				return;
	    			}else{
	    				Alert.alert(this.state.trainer.name + ' has a session at ' + this.dateToString(session.start) + ' for ' + session.duration + ' mins.');
	    				return;
	    			}
	    		}
	    	}

			Alert.alert(
		      'Book session with ' + this.state.trainer.name + ' for $' + price + ' at ' + this.dateToString(this.state.bookDate),
		      '',
		     	[
	        	{text: 'No'},
	        	{text: 'Yes', onPress: () => {
	         	pendingRef.push({
		          	trainee: user.uid,
		          	traineeName: this.state.user.name,
		          	trainer: this.props.trainer.key,
		          	trainerName: this.state.trainer.name,
		          	start: this.state.bookDate.toString(),
		          	duration: this.state.bookDuration,
		          	location: this.props.gym.location,
		          	gym: this.props.gym.name,
		          	rate: this.state.trainer.rate,
		          	read: false,
		          	traineeStripe: this.state.user.stripeId
	         	});
	         	this.props.hide();
	         	setTimeout(this.props.confirm, 1000);
	        }},
	      	]);
	   	}
  	}

	render(){
		if(this.state.trainer == 'null' || typeof this.state.trainer == undefined){
			return <Expo.AppLoading />
		}else{
			return(
				<View style={styles.modal}>
					<View style={styles.nameContainer}>
	              		<Text style={styles.trainerName}>{this.state.trainer.name}</Text>
	            	</View>
					<View style={styles.formContainer}>
			            <Text style={styles.bookDetails}>{this.props.gym.name}</Text>
			            <View style={styles.inputRow}>
			            <Text style ={styles.bookFormLabel}>Session Time</Text>
			            <View style={styles.datePickerHolder}>
				            <DatePickerIOS
				                mode='time'
				                itemStyle={{color: '#08d9d6'}}
				                textColor='#08d9d6'
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
			                itemStyle={{height: 70, color: '#08d9d6'}}
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
		flex: .9,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: '#252a34',
		borderRadius: 10,
	},
	trainerName: {
    	fontSize: 30,
    	color: '#FAFAFA',
    	fontWeight: '500'
  	},
	nameContainer: {
	    height: '12%',
	    width: '100%',
	    borderTopLeftRadius: 10,
	    borderTopRightRadius: 10,
	    backgroundColor: '#08d9d6',
	    flexDirection: 'column',
	    justifyContent: 'center',
	    alignItems: 'center'
  	},
	bookDetails:{
    	fontSize: 20,
    	fontWeight: '500',
    	color: '#ff2e63'
  	},
  	bookFormLabel: {
    	fontSize: 20,
    	fontWeight: '500',
    	width: '33%',
    	textAlign: 'center',
    	color: '#08d9d6'
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
		borderColor: '#ff2e63',
	},
	picker: {
		height: 70,
		borderWidth: 1,
		borderColor: '#ff2e63',
		width: '65%',
	},
	bookButton: {
    	paddingVertical: 15,
    	backgroundColor: '#ff2e63',
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
    	color: '#FAFAFA',
    	fontWeight: '700'
  	}
})