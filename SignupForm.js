import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, Switch, Image, Picker, Linking } from 'react-native';
import { Actions } from 'react-native-router-flux';
import { ImagePicker, Font, Permissions } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import COLORS from './Colors';
var stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');

export class SignupForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			trainer: false,
			page: 1,
			fontLoaded: false,
			gymLoaded: false,
			name:'',
			email: '',
			password: '',
			confirmPass: '',
			gym:'none',
			rate:'',
			bio:'',
			cert:'',
			ssn:'',
			birthDay:'',
			image: 'null',
			gyms: [],
			pressed: false
		}; 

		this.onSignUpPress=this.onSignUpPress.bind(this);
		this.goNext=this.goNext.bind(this);
		this.goBack=this.goBack.bind(this);
	}

	async componentDidMount() {
		
		if(!this.state.fontLoaded){
			this.loadFont();
		}
		if(!this.state.gymLoaded){
			var gyms = this.loadGyms();
			this.setState({gyms: gyms, gymLoaded: true});
		}
	}

	loadFont = async () => {
		await Expo.Font.loadAsync({
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
	    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
	    if (status === 'granted') {
	      let result = await ImagePicker.launchImageLibraryAsync({
	        allowsEditing: true,
	        aspect: [4, 3],
	      });

	      if (!result.cancelled) {
	        this.setState({ image: result.uri });
	      }
	    } else {
	      throw new Error('Camera roll permission not granted');
	    }
  	}

  	async uploadImageAsync(uri, uid) {
	  	const response = await fetch(uri);
	  	const blob = await response.blob();
	  	const ref = firebase.storage().ref().child(uid);

		  const snapshot = await ref.put(blob);
		  return snapshot.downloadURL;
	}

	async onSignUpPress() {
		// client side authentication
		if(this.state.pressed){
			return;
		}
		this.state.pressed = true;
		var name = this.state.name;
		var nameSplit = name.split(" ");
		var firstName = nameSplit[0];
		var lastName = nameSplit[1];
		var email = this.state.email;
		var phone = this.state.phone;
		var pw = this.state.password;
		var trainer = this.state.trainer;
		var uri = this.state.image;

		if(this.state.trainer){
			var rate = this.state.rate;
			var cert = this.state.cert;
			var bio = this.state.bio;
			var gymKey = this.state.gyms[this.state.gym].key;
			var ssn = {
				pii: {
					personal_id_number: this.state.ssn
				}
			}
			if(this.state.gyms[gym].type == 'independent'){
				var date = this.state.birthDay;
				var dateSplit = date.split("/");
				try {
					var pii = await stripe.createToken(ssn);
				}catch(error){
					this.state.pressed = false;
					Alert.alert('Invalid SSN entered. Please check your info and try again!');
					return;
				}
				var token = pii.id;
				var month = dateSplit[0];
				var day = dateSplit[1];
				var year = dateSplit[2];
				var address = this.state.address;
				var city = this.state.city;
				var state = this.state.state;
				var zip = this.state.zip;
		    	try {
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createTrainer/', {
						method: 'POST',
						body: JSON.stringify({
							line1: address,
							city: city,
							state: state,
							zip: zip,
							email: email,
							phone: phone,
							firstName: firstName,
							lastName: lastName,	
							token: token,
							day: day,
							month: month,
							year: year
						}),
					});
					const data = await res.json();
				    data.body = JSON.parse(data.body);
				    if(data.body.message == 'Success'){
					    firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
						.then(async function(firebaseUser) {
							var userRef = firebase.database().ref('users');
							var gymRef = firebase.database().ref('/gyms/' + gymKey + '/trainers/');
							gymRef.child(firebaseUser.uid).set({
								active: false,
								bio: bio,
								cert: cert,
								name: name,
								rate: rate,
								rating: 0
							});
							userRef.child(firebaseUser.uid).set({
								trainer: true,
								type: 'independent',
								name: name,
						    	gym: gymKey,
					      		cert: cert,
					      		rate: rate,
					      		bio: bio,
					      		phone: phone,
					      		active: false,
					      		rating: 0,
					      		sessions: 0,
					      		stripeId: data.body.trainer.id,
					      		cardAdded: false
					    	});
					    	if(uri != 'null'){
								this.uploadImageAsync(uri, firebaseUser.uid);
							}
							firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function() {
								Actions.reset('modal');
								Alert.alert('You must enter a debit card for payouts before trainees can book a session with you!');
							});
						}.bind(this)).catch(function(error) {
							var errorMessage = error.message;
							this.state.pressed = false;
							Alert.alert(errorMessage);
							return;
						}.bind(this));
					}else{
						this.state.pressed = false;
						Alert.alert('There wan an error creating your stripe Account. Please review your email, address, birthday, and ssn and try again!');
						return;
					}
				}catch(error) {
					this.state.pressed = false;
					Alert.alert('There wan an error creating your stripe Account. Please review your email, address, birthday, and ssn and try again!');
					return;
				}
			}else{
				firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
				.then(async function(firebaseUser) {
					var userRef = firebase.database().ref('users');
					var gymRef = firebase.database().ref('/gyms/' + gymKey + '/pendingtrainers/');
					gymRef.child(firebaseUser.uid).set({
						active: false,
						bio: bio,
						cert: cert,
						name: name,
						rate: rate,
						rating: 0
					});
					userRef.child(firebaseUser.uid).set({
						pending: true,
						trainer: true,
						type: 'managed',
						name: name,
				    	gym: gymKey,
			      		cert: cert,
			      		rate: rate,
			      		bio: bio,
			      		phone: phone,
			      		active: false,
			      		rating: 0,
			      		sessions: 0,
			    	});
			    	if(uri != 'null'){
						this.uploadImageAsync(uri, firebaseUser.uid);
					}
					Alert.alert('Your account is now pending approval. Sign in once your gym manager approves your account.');
					Actions.reset('login');
				}.bind(this)).catch(function(error) {
					var errorMessage = error.message;
					this.state.pressed = false;
					Alert.alert(errorMessage);
					return;
				}.bind(this));
			}
		}else{
			firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
			.then(async function(firebaseUser) {	
				var userRef = firebase.database().ref('users');
				userRef.child(firebaseUser.uid).set({
		      		trainer: false,
		      		name: name,
		      		phone: phone,
		      		rating: 0,
		      		sessions: 0,
		      		cardAdded: false,
		    	});
		    	if(uri != 'null'){
					this.uploadImageAsync(uri, firebaseUser.uid);
				}
				firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function() {
					Actions.reset('map')
				});
			}.bind(this)).catch(function(error) {
				this.state.pressed = false;
				var errorMessage = error.message;
			    Alert.alert(errorMessage);
			    return;
			}.bind(this));
		}
		
	}

	goBack(){
		if(this.state.page == 2){
			this.setState({page: 1});
		}else if(this.state.page == 3){
			this.setState({page: 2});
		}else{
			if(this.state.trainer){
				if(this.state.gyms[this.state.gym].type == 'owner'){
					this.setState({page: 2})
				}else{
					this.setState({page: 3});
				}
			}else{
				this.setState({page: 1});
			}
		}
	}

	async goNext() {
		if(this.state.page == 1){
			
			if(!this.state.name.trim().length){
				Alert.alert("Please enter a name!");
				return;
			}
			if(!this.state.email.trim().length){
				Alert.alert("Please enter an email!");
				return;
			}
			if(this.state.password.trim().length < 6){
				Alert.alert("Please enter a password at least 6 characters long!");
				return;
			}
			if(this.state.password != this.state.confirmPass){
				Alert.alert("Passwords must match!");
				return;
			}
			if(this.state.phone.trim().length < 10){
				Alert.alert("Please enter a valid phone number");
				return;
			}

			var emailExists;
			const emailCheck = await firebase.auth().fetchSignInMethodsForEmail(this.state.email).then(function(methods){
				if(methods.length > 0){
					Alert.alert("That email is already in use.");
					return;
				}
			}, function(error){
				Alert.alert("Please enter a valid email");
				return;
			}.bind(this));

			if(this.state.trainer){
				this.setState({page: 2});
			}else{
				this.setState({page: 4});
			}

		}else if(this.state.page == 2){
			if(this.state.gym == 'none'){
				Alert.alert("Please select a gym!");
				return;
			}
			if(!this.state.cert.length){
				Alert.alert("Please enter your certifications!");
				return;
			}
			if(!this.state.bio.length){
				Alert.alert("Please fill out your bio!");
				return;
			}
			if(this.state.gyms[this.state.gym].type == 'owner'){
				this.setState({page: 4});
			}else{
				if(this.state.rate == "" || this.state.rate < 25){
					Alert.alert("Please enter your rate (has to be $25+)!");
					return;
				}
				if(!this.state.ssn.length){
					Alert.alert("Please enter your SSN!");
					return;
				}
				if(this.state.birthDay == ""){
					Alert.alert("Please enter your birthday!");
					return;
				}
				this.setState({page: 3});
			}
		}else{
			if(!this.state.address){
				Alert.alert("Please enter an address!");
				return;
			}
			if(!this.state.city.length){
				Alert.alert("Please enter a city!");
				return;
			}
			if(this.state.zip.length != 5){
				Alert.alert("Please enter a valid 5 digit zip code!");
				return;
			}
			if(this.state.state.trim().length != 2){
				Alert.alert("Please enter a valid state Abbreviation!");
				return;
			}
			this.setState({page: 4});
		}
	}

	render() {

		var image = this.state.image;
		var gyms = this.state.gyms;
		var page1 = page2 = page3 = page4 = null;
		var submitButton = agreement = null;

		prevButton = (
			<TouchableOpacity style={styles.buttonContainer} onPressIn={this.goBack}>
				<Text 
					style={styles.buttonText}
					>
					Previous
				</Text>
			</TouchableOpacity>
		);

		nextButton = (
			<TouchableOpacity style={styles.buttonContainer} onPressIn={this.goNext}>
					<Text style={styles.buttonText}> Next </Text>
			</TouchableOpacity>
		);

		if(this.state.page == 1){
			prevButton = null;
			page1 = (
			<View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Full Legal Name (First and Last Only)"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						onChangeText={(name) => this.setState({name})}
						value={this.state.name}
						underlineColorAndroid='transparent'
						autoCorrect={false} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.envelope}</FontAwesome>
					</Text>
					<TextInput 
						placeholder="Email"
						keyboardType="email-address"
						autoCapitalize="none"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(email) => this.setState({email})}
						value={this.state.email} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.lock}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Password"
						secureTextEntry
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(password) => this.setState({password})}
						value={this.state.password} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.check}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Confirm Password"
						secureTextEntry
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(confirmPass) => this.setState({confirmPass})}
						value={this.state.confirmPass} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.phone}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Phone Number"
						returnKeyType="done"
						keyboardType="number-pad"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(phone) => this.setState({phone})}
						value={this.state.phone} />
				</View>
				<View style={styles.inputRow}>
					<Text style = {styles.hints}>Are you signing up as a trainer? </Text>
					<Switch
						onTintColor={COLORS.PRIMARY}
						tintColor={COLORS.PRIMARY}
						thumbTintColor={COLORS.SECONDARY}
						value={this.state.trainer}
						onValueChange={(trainer) => this.setState({trainer})}
						/>
				</View>
			</View>
			);
		}else if(this.state.page == 2){
			page2 = (
			<View style={styles.container}>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.building}</FontAwesome>
					</Text>
					<Picker
						style={styles.picker}
						itemStyle={{height: 45, color: COLORS.PRIMARY}}
					  	selectedValue={this.state.gym}
					  	onValueChange={(itemValue) => this.setState({gym: itemValue})}>
					  	<Picker.Item label="Pick a Gym (Scroll)" value='none' key='0'/>
					  	{gyms.map(function(gym, index){
					  		return (<Picker.Item label={gym.name} value={index} key={gym.key}/>);
					  	})}
					</Picker>
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.dollar}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Rate ($ hourly)"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(rate) => this.setState({rate})}
						value={this.state.rate}
						keyboardType="number-pad"
						returnKeyType="done" />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.info}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Enter your bio here (specialities, schedule, experience, etc.)"
						multiline={true}
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText = {(bio) => this.setState({bio})}
						maxLength={250}
						value={this.state.bio} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.vcard}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Certifications"
						returnKeyType="next"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(cert) => this.setState({cert})}
						value={this.state.cert}
						spellCheck={true} 
						maxLength={200}/>
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput
						placeholder="SSN (For Stripe Account)"
						returnKeyType="done"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(ssn) => this.setState({ssn})}
						value={this.state.ssn}
						keyboardType="number-pad"/>
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Birth Date (mm/dd/yyyy)"
						returnKeyType="done"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(birthDay) => this.setState({birthDay})}
						value={this.state.birthDay}/>
				</View>
			</View>
			);
		}else if(this.state.page == 3){
			var page3 = (
			<View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.envelope}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Address"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						onChangeText={(address) => this.setState({address})}
						value={this.state.address}
						underlineColorAndroid='transparent'
						autoCorrect={false} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.map}</FontAwesome>
					</Text>
					<TextInput 
						placeholder="City"
						autoCapitalize="none"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(city) => this.setState({city})}
						value={this.state.city} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.mapMarker}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Zip Code"
						returnKeyType="done"
						keyboardType="number-pad"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(zip) => this.setState({zip})}
						value={this.state.zip} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.map}</FontAwesome>
					</Text>
					<TextInput 
						placeholder="State (Abbreviation eg. CA)"
						autoCapitalize="none"
						style={styles.input}
						maxLength={2}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(state) => this.setState({state})}
						value={this.state.state} />
				</View>
			</View>
			);
		}else{
			nextButton = null;
			if(image != 'null'){
				page4 = (
					<View style={styles.imageContainer}>
						<Image source={{ uri: image }} style={styles.imageHolder} />
						<TouchableOpacity style={styles.pictureButton} onPressIn={this._pickImage}>
							<Text style={styles.buttonText}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
						</TouchableOpacity>
					</View>);
			}else{
				page4 = (
					<View style={styles.imageContainer}>
						<View style={styles.imageHolder}>
							<TouchableOpacity style={styles.pictureButton} onPressIn={this._pickImage}>
								<Text style={styles.pictureIcon}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
							</TouchableOpacity>
						</View>
					</View>);
			}
			
			submitButton = (
			<TouchableOpacity ref={btn => { this.btn = btn; }} style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
				<Text style={styles.buttonText}> Signup </Text>
			</TouchableOpacity>
			);
			agreement = (
				<View style={{marginTop: 15}}>
					<Text style={styles.agreement}>
					By registering for an account you agree to the </Text>
					<TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/legal')}>
						<Text style={styles.link}> Stripe Services Agreement</Text>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => Linking.openURL('https://stripe.com/en-US/connect-account/legal')}>
						<Text style={styles.link}> Stripe Connected Account Agreement.</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return (
			<View style={styles.container}>
				<StatusBar barStyle="dark-content" />
				{page1}
				{page2}
				{page3}
				{page4}
				{prevButton}
				{nextButton}
				{submitButton}
				{agreement}
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
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
		borderColor: COLORS.PRIMARY,
		width: '90%',
		color: COLORS.PRIMARY
	},
	picker: {
		height: 45,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		width: '90%',
	},
	buttonContainer: {
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: 200,
		marginTop: 5,
	},
	pictureButton: {
		backgroundColor: COLORS.SECONDARY,
		width: 40,
		height: 40,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	pictureIcon: {
		color: '#f6f5f5',
		fontSize: 30,
		textAlign: 'center'
	},
	buttonText: {
		fontSize: 20,
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	imageContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 220,
		height: 220,
		borderWidth: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		borderColor: COLORS.SECONDARY,
	},
	icon: {
		color: COLORS.PRIMARY,
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	hints:{
		color: COLORS.PRIMARY,		
		marginBottom: 10,
		marginRight: 10
	},
	agreement:{
		color: COLORS.PRIMARY,		
		textAlign: 'center'
	},
	link:{
		color: COLORS.PRIMARY,		
		textAlign: 'center',
		textDecorationLine: 'underline'
	}
});