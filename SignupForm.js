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
  Switch,
  Image,
  Picker
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { ImagePicker } from 'expo';
import firebase from 'firebase';



export class SignupForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: false,
			nextForm: false,
			pictureForm: false,
			name:'',
			email: '',
			password: '',
			confirmPass: '',
			gym:'',
			rate:'',
			bio:'',
			cert:'',
			image: 'null',
			gyms: [],
		};
		this.onSignUpPress=this.onSignUpPress.bind(this);
	}

	async componentDidMount() {
		var gyms = this.loadGyms();
		this.setState({gyms: gyms});
	}

	_pickImage = async () => {
    	let result = await ImagePicker.launchImageLibraryAsync({
     		allowsEditing: true,
      		aspect: [4, 3],
    	});

    	if (!result.cancelled) {
      		this.setState({ image: result.uri });
    	}
    }

    //Load gyms from db for MapView
  	loadGyms(){
	    var items = [];
	    var gymsRef = firebase.database().ref('gyms');
	    gymsRef.once('value', function(data) {
	      data.forEach(function(dbevent) {
	        var item = dbevent.val();
	        item.key = dbevent.key;
	        items.push(item);
	      });
	    });
    	return items;
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
		var image = this.state.image;

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

		Alert.alert("Loading...");
		firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
			.then(function(firebaseUser) {
				
				var userRef = firebase.database().ref('users');
				if(trainer){
					var gymRef = firebase.database().ref('/gyms/' + gym + '/trainers');
					gymRef.child(firebaseUser.uid).set({
						active: false,
						bio: bio,
						cert: cert,
						name: name,
						rate: rate,
					});
					userRef.child(firebaseUser.uid).set({
						trainer: true,
						name: name,
				    	gym: gym,
			      		cert: cert,
			      		rate: rate,
			      		bio: bio,
			      		image: image,
			      		active: false
			    	});
				}else{
					userRef.child(firebaseUser.uid).set({
			      		trainer: false,
			      		name: name,
			      		image: image
			    	});
				}

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
		var isTrainer = this.state.trainer;
		var nextForm = this.state.nextForm;
		var pictureForm = this.state.pictureForm;
		var image = this.state.image;
		var gyms = this.state.gyms;

		if(nextForm){
			nameField = emailField = passField = confirmField = passHint = pictureButton = trainerField = trainerHint = imageHolder = null;

			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
					<Text 
						style={styles.buttonText}
						>
						Signup
					</Text>
				</TouchableOpacity>);
			gymField = 
				<Picker
				  selectedValue={this.state.gym}
				  onValueChange={(itemValue, itemIndex) => this.setState({gym: itemValue})}>
				  {gyms.map(function(gym){
				  	return (<Picker.Item label={gym.name} value={gym.key} />);
				  })}
				</Picker>;
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
		}else if(pictureForm){
			nameField = emailField = passField = confirmField = passHint = trainerField = trainerHint = null;
			 prevButton = gymField = rateField = bioField = certField = null;
			prevButton = 
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({nextForm: true})}>
					<Text 
						style={styles.buttonText}
						>
						Previous
					</Text>
				</TouchableOpacity>;
			if(image != 'null'){
				imageHolder = (<Image source={{ uri: image }} style={{ width: 200, height: 200 }} />);
			}
			pictureButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this._pickImage()}>
					<Text 
						style={styles.buttonText}
						>
						Add Picture
					</Text>
				</TouchableOpacity>
			);
		}else{
			prevButton = gymField = rateField = bioField = certField = imageHolder = pictureButton = null;

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

		}

		if(isTrainer && !nextForm && !pictureForm){
			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({nextForm: true})}>
					<Text 
						style={styles.buttonText}
						>
						Next
					</Text>
				</TouchableOpacity>);

		}else if((!isTrainer && !pictureForm) || (isTrainer && nextForm)){
			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({pictureForm: true, nextForm: false})}>
					<Text 
						style={styles.buttonText}
						>
						Next
					</Text>
				</TouchableOpacity>);

		}else if(pictureForm){
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
				{imageHolder}
				{pictureButton}
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