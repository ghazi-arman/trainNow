import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';



export class SignupForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: false,
			nextForm: false,
			name:'',
			email: '',
			password: '',
			confirmPass: '',
			gym:'',
			rate:'',
			bio:'',
			cert:'',
		};
		this.onSignUpPress=this.onSignUpPress.bind(this);
	}

	onSignUpPress() {
		// client side authentication
		var name = this.state.name;
		var email = this.state.email;
		var pw = this.state.password;
		var cpw = this.state.confirmPass;
		var gym = this.state.gym;
		var rate = this.state.rate;
		var cert = this.state.cert;
		var bio = this.state.bio;
		var trainer = this.state.trainer;
		Alert.alert("Loading...");

		//email missing
		if(!email.length) {
			Alert.alert("Please enter an email!");			
			return;			
		}

		//name missing
		if(!name.length) {
			Alert.alert("Please enter a name!");	
			return;			
		}		

		//pw length
		if(pw.length < 6) {
			Alert.alert("Password must be over 6 characters!");		
			return;
		}

		//passwords don't match
		if(pw != cpw){
			Alert.alert("Passwords do not match!");
			return;
		}

		if(trainer){
			if(!gym.length){
				Alert.alert("Please enter a gym!");
				return;
			}
			if(!rate.length){
				Alert.alert("Please enter a rate!");
				return;
			}
			if(!cert.length){
				Alert.alert("Please enter your certifications!");
				return;
			}
			if(!bio.length){
				Alert.alert("Please enter your bio!");
				return;
			}
		}

		firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
			.then(function(firebaseUser) {
				
				var userRef = firebase.database().ref('users');
				if(trainer){
					var gymRef = firebase.database().ref('/gyms/-LI-i3Nl2G6orr78D8QH/trainers');
					gymRef.child(firebaseUser.uid).set({
						active: false,
						bio: bio,
						cert: cert,
						name: name,
						rate: rate
					});
					userRef.child(firebaseUser.uid).set({
						trainer: true,
						name: name,
				    	gym: '-LI-i3Nl2G6orr78D8QH',
			      		cert: cert,
			      		rate: rate,
			      		bio: bio,
			      		active: false
			    	});
				}else{
					userRef.child(firebaseUser.uid).set({
			      		trainer: false,
			      		name: name
			    	});
				}

			  	// var gymRef = firebase.database().ref('gyms');
			  	// gymRef.push({	
			  	// 	name: '24 Hour Fitness',
			  	// 	location: {latitude: 32.959892, longitude: -117.11205},
			  	// 	trainers: [{key: firebaseUser.uid,
			  	// 				name: name,
			  	// 				gym: gym,
			  	// 				rate: rate,
			  	// 				bio: bio}],
			  	// 	hours: '10-10'
			  	// });

			  	// gymRef.push({
			  	// 	name: 'LA Fitness',
			  	// 	location: {latitude: 33.016937, longitude: -117.109838},
			  	// 	trainers: [firebaseUser.uid, "12341235223sda"],
			  	// 	hours: '6-11'
			  	// });

				// Alert.alert("Sign up successful!");
				// return to login page after sign up
				Actions.pop();				
			})
			.catch(function(error) {
			    // Handle Errors here.
			    var errorMessage = error.message;
			    alert(errorMessage);
			    this.setState({
			    	email: '',
			    	password: '',
			    });
			}.bind(this));

	}


	render() {
		let isTrainer = this.state.trainer;
		let nextForm = this.state.nextForm;
		let text;
		if(nextForm){
			nameField = null;
			emailField = null;
			passField = null;
			confirmField = null;
			passHint = null;
			trainerField = null
			trainerHint = null;
			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
					<Text 
						style={styles.buttonText}
						>
						Signup
					</Text>
				</TouchableOpacity>);
			gymField = 
				<TextInput
					placeholder="Gym"
					returnKeyType="done"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(gym) => this.setState({gym})}
					value={this.state.gym}
					autoCorrect={false}
					/>;
			rateField = 
				<TextInput
					placeholder="Rate ($ hourly)"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(rate) => this.setState({rate})}
					value={this.state.rate}
					keyboardType="number-pad"
					returnKeyType="done"
					/>;
			certField = 
				<TextInput
					placeholder="Certifications"
					returnKeyType="done"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(cert) => this.setState({cert})}
					value={this.state.cert}
					autoCorrect={false}
					/>;
			bioField =
				<TextInput
					autoCorrect={false}
					blurOnSumbit={true}
					placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
					multiline={true}
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText = {(bio) => this.setState({bio})}
					value={this.state.bio}
					/>;
			prevButton = 
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({nextForm: false})}>
					<Text 
						style={styles.buttonText}
						>
						Previous
					</Text>
				</TouchableOpacity>;
		}else{
			nameField = 
				<TextInput
					placeholder="Full Name"
					returnKeyType="done"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(name) => this.setState({name})}
					value={this.state.name}
					autoCorrect={false}
					/>;
			emailField = 
				<TextInput 
					placeholder="Email"
					returnKeyType="done"
					onSubmitEditing={() => this.passwordInput.focus()}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(email) => this.setState({email})}
					value={this.state.email}
					/>;

			passField =
				<TextInput
					placeholder="Password"
					returnKeyType="done"
					secureTextEntry
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(password) => this.setState({password})}
					value={this.state.password}
					ref={(input) => this.passwordInput = input}
					/>;
			confirmField =
				<TextInput
					placeholder="Confirm Password"
					returnKeyType="done"
					secureTextEntry
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#FFF'
					onChangeText={(confirmPass) => this.setState({confirmPass})}
					value={this.state.confirmPass}
					ref={(input) => this.passwordInput = input}
					/>;
			passHint = <Text style = {styles.hints}> Password must contain 6-12 characters </Text>;

			trainerField = 				
				<Switch
					style={styles.switch}
					value={this.state.trainer}
					onValueChange={(trainer) => this.setState({trainer})}
					/>;
			trainerHint = <Text style = {styles.question}>Are you signing up as a trainer? </Text>;

			prevButton = null;
			gymField = null;
			rateField = null;
			bioField = null;
			certField = null;
		}
		if(isTrainer && !nextForm){
			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({nextForm: true})}>
					<Text 
						style={styles.buttonText}
						>
						Next
					</Text>
				</TouchableOpacity>);

		}else{
			submitButton =(
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
					<Text 
						style={styles.buttonText}
						>
						Signup
					</Text>
				</TouchableOpacity>);
		}
		return (
			<View style = {styles.container}>
			<StatusBar 
				barStyle="light-content"
				/>
				{nameField}
				{emailField}
				{passField}
				{confirmField}
				{passHint}
				{gymField}
				{rateField}
				{bioField}
				{certField}
				{trainerHint}
				{trainerField}
				{prevButton}				
				{submitButton}
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
	},
	switch: {
		marginBottom: 10,
	},
	input: {
		height: 40,
		backgroundColor: 'rgba(255,255,255,0.2)',
		marginBottom: 10,
		color: '#FFF',
		paddingHorizontal: 10,
	},
	buttonContainer: {
		backgroundColor: '#C51162',
		paddingVertical: 15,
		marginTop: 10
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	hints:{
		color: 'rgba(255,255,255,0.5)',		
		marginBottom: 10,
	},
	question:{
		color: '#FFF',
		marginBottom:10,
	}
});