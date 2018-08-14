import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, Switch, Image, Picker } from 'react-native';
import { Actions } from 'react-native-router-flux';
import { ImagePicker } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';

export class SignupForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: false,
			nextForm: false,
			pictureForm: false,
			fontLoaded: false,
			gymLoaded: false,
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
		
		if(!this.state.fontLoaded){
			this.loadFont();
		}
		var gyms = this.loadGyms();
		this.setState({gyms: gyms});
	}

	loadFont = async () => {
		await Font.loadAsync({
	      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
	      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
	    });
	    this.setState({fontLoaded: true});
	}

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

  	_pickImage = async () => {
    	let result = await ImagePicker.launchImageLibraryAsync({
     		allowsEditing: true,
      		aspect: [4, 3],
    	});

    	if (!result.cancelled) {
      		this.setState({ image: result.uri });
    	}
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
			nameField = emailField = passField = confirmField = pictureButton = trainerField = imageHolder = null;

			submitButton = (
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
					<Text 
						style={styles.buttonText}
						>
						Signup
					</Text>
				</TouchableOpacity>);
			gymField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.building}</FontAwesome>
				</Text>
				<Picker
					style={styles.picker}
					itemStyle={{height: 45}}
				  	selectedValue={this.state.gym}
				  	onValueChange={(itemValue, itemIndex) => this.setState({gym: itemValue})}>
				  	<Picker.Item label="Pick a Gym (Scroll)" value= '' />
				  	{gyms.map(function(gym){
				  		return (<Picker.Item label={gym.name} value={gym.key} />);
				  	})}
				</Picker>
			</View>);
			rateField = ( 
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.dollar}</FontAwesome>
				</Text>
				<TextInput
					placeholder="Rate ($ hourly)"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(rate) => this.setState({rate})}
					value={this.state.rate}
					keyboardType="number-pad"
					returnKeyType="done" />
			</View>);
			certField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.vcard}</FontAwesome>
				</Text>
				<TextInput
					placeholder="Certifications"
					returnKeyType="done"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(cert) => this.setState({cert})}
					value={this.state.cert}
					autoCorrect={false} />
			</View>);
			bioField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.info}</FontAwesome>
				</Text>
				<TextInput
					autoCorrect={false}
					blurOnSumbit={true}
					placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
					multiline={true}
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText = {(bio) => this.setState({bio})}
					value={this.state.bio} />
			</View>);
			prevButton = 
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this.setState({nextForm: false})}>
					<Text 
						style={styles.buttonText}
						>
						Previous
					</Text>
				</TouchableOpacity>;
		}else if(pictureForm){
			nameField = emailField = passField = confirmField = trainerField = null;
			 prevButton = gymField = rateField = bioField = certField = null;
			prevButton = 
				<TouchableOpacity style={styles.buttonContainer} 
					onPressIn={() => 
						(isTrainer) ? this.setState({nextForm: true, pictureForm: false})
						: this.setState({pictureForm: false})}>
					<Text 
						style={styles.buttonText}
						>
						Previous
					</Text>
				</TouchableOpacity>;
			if(image != 'null'){
				imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: image }} style={styles.imageHolder} /></View>);
			}else{
				imageHolder = (<View style={styles.imageContainer}><View style={styles.imageHolder}></View></View>);
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

			nameField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.user}</FontAwesome>
				</Text>
				<TextInput
					placeholder="Full Name"
					returnKeyType="done"
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(name) => this.setState({name})}
					value={this.state.name}
					autoCorrect={false} />
			</View>);
			emailField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.envelope}</FontAwesome>
				</Text>
				<TextInput 
					placeholder="Email"
					returnKeyType="done"
					onSubmitEditing={() => this.passwordInput.focus()}
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(email) => this.setState({email})}
					value={this.state.email} />
			</View>);
			passField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.lock}</FontAwesome>
				</Text>
				<TextInput
					placeholder="Password"
					returnKeyType="done"
					secureTextEntry
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(password) => this.setState({password})}
					value={this.state.password}
					ref={(input) => this.passwordInput = input} />
			</View>);
			confirmField = (
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.check}</FontAwesome>
				</Text>
				<TextInput
					placeholder="Confirm Password"
					returnKeyType="done"
					secureTextEntry
					style={styles.input}
					selectionColor="#FFF"
					placeholderTextColor='#69D2E7'
					onChangeText={(confirmPass) => this.setState({confirmPass})}
					value={this.state.confirmPass}
					ref={(input) => this.passwordInput = input} />
			</View>);
			trainerField = (
			<View style={styles.inputRow}>
				<Text style = {styles.hints}>Are you signing up as a trainer? </Text>
				<Switch
					onTintColor="#69D2E7"
					tintColor="#FA6900"
					thumbTintColor="#FA6900"
					value={this.state.trainer}
					onValueChange={(trainer) => this.setState({trainer})}
					/>
			</View>);

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
			<View>
			<StatusBar barStyle="dark-content" />
				{nameField}
				{emailField}
				{passField}
				{confirmField}
				{gymField}
				{rateField}
				{bioField}
				{certField}
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
	inputRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end',
		marginBottom: 20
	},
	input: {
		height: 40,
		borderWidth: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderColor: '#F38630',
		width: '90%'
	},
	picker: {
		height: 45,
		borderWidth: 1,
		borderColor: '#F38630',
		width: '90%',
	},
	buttonContainer: {
		backgroundColor: '#69D2E7',
		paddingVertical: 15,
		marginTop: 20
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	imageContainer: {
		flexDirection: 'row',
		justifyContent: 'center'
	},
	imageHolder: {
		height: 200,
		width: 200,
		borderWidth: 1,
		borderColor: '#F38630',
	},
	icon: {
		color: '#69D2E7',
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	hints:{
		color: '#69D2E7',		
		marginBottom: 10,
		marginRight: 10
	}
});