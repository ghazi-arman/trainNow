import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, Switch, Image, Picker } from 'react-native';
import { Actions } from 'react-native-router-flux';
import { ImagePicker, Font, Permissions } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
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
			gym:'',
			rate:'',
			bio:'',
			cert:'',
			ssn:'',
			image: 'null',
			gyms: [],
		}; 

		this.onSignUpPress=this.onSignUpPress.bind(this);
		this.goNext=this.goNext.bind(this);
		this.goBack=this.goBack.bind(this);
	}

	async componentDidMount() {
		
		if(!this.state.fontLoaded){
			this.loadFont();
		}
		var gyms = this.loadGyms();
		this.setState({gyms: gyms});
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
		var name = this.state.name;
		var nameSplit = name.split(" ");
		var firstName = nameSplit[0];
		var lastName = nameSplit[1];

		var email = this.state.email;
		var phone = this.state.phone;
		var pw = this.state.password;
		var cpw = this.state.confirmPass;
		var gym = this.state.gym;
		var rate = this.state.rate;
		var cert = this.state.cert;
		var bio = this.state.bio;
		var trainer = this.state.trainer;
		var uri = this.state.image;
		var ssn = {
			pii: {
				personal_id_number: this.state.ssn
			}
		}
		if(trainer){
			var date = this.state.birthDay;
			var dateSplit = date.split("/");
			var pii = await stripe.createToken(ssn);
			var token = pii.id;
			var month = dateSplit[0];
			var day = dateSplit[1];
			var year = dateSplit[2];
		}

		firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
			.then(async function(firebaseUser) {
				
				var userRef = firebase.database().ref('users');
				if(trainer){

					var gymRef = firebase.database().ref('/gyms/' + gym + '/trainers/');
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
						name: name,
				    	gym: gym,
			      		cert: cert,
			      		rate: rate,
			      		bio: bio,
			      		phone: phone,
			      		active: false,
			      		rating: 0,
			      		sessions: 0,
			    	});
			    	try {
						const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createTrainer/', {
							method: 'POST',
							body: JSON.stringify({
								email: email,
								id: firebaseUser.uid,
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
					    console.log(data.body);
					    var userRef = firebase.database().ref('users');
					    userRef.child(firebaseUser.uid).update({
					        stripeId: data.body.trainer.id
					    });
					}catch(error) {
						console.log(error);
					}
				}else{
					userRef.child(firebaseUser.uid).set({
			      		trainer: false,
			      		name: name,
			      		phone: phone,
			      		rating: 0,
			      		sessions: 0
			    	});
				}
				
				if(uri != 'null'){
					this.uploadImageAsync(uri, firebaseUser.uid);
				}

				firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function() {
					Actions.reset('map');
				});
			}.bind(this))
			.catch(function(error) {
			    var errorMessage = error.message;
			    Alert.alert(errorMessage);
			}.bind(this));

	}

	goBack(){
		if(this.state.page == 2){
			this.setState({page: 1});
		}else if(this.state.page == 3 && !this.state.trainer){
			this.setState({page: 1});
		}else{
			this.setState({page: 2});
		}
	}

	async goNext() {
		if(this.state.page == 1){
			
			if(!this.state.name.length){
				Alert.alert("Please enter a name!");
				return;
			}
			if(!this.state.email.length){
				Alert.alert("Please enter an email!");
				return;
			}
			if(this.state.password.length < 6){
				Alert.alert("Please enter a password at least 6 characters!");
				return;
			}
			if(this.state.password != this.state.confirmPass){
				Alert.alert("Passwords must match!");
				return;
			}
			if(this.state.phone.length < 10){
				Alert.alert("Please enter a valid phone number");
			}

			var emailExists;
			var invalidEmail = false;
			const emailCheck = await firebase.auth().fetchSignInMethodsForEmail(this.state.email).then(function(methods){
				if(methods.length == 0){
					emailExists = false;
				}else{
					emailExists = true;
				}
			}, function(error){
				invalidEmail = true;
			});

			if(invalidEmail){
				Alert.alert('Please enter a valid email!');
				return;
			}
			if(emailExists){
				Alert.alert('That email is already in use!');
				return;
			}

			if(this.state.trainer){
				this.setState({page: 2});
			}else{
				this.setState({page: 3});
			}

		}else{
			
			if(!this.state.gym.length){
				Alert.alert("Please select a gym!");
				return;
			}
			if(!this.state.rate.length){
				Alert.alert("Please enter your rate!");
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

			this.setState({page: 3});
		}
	}

	render() {

		var image = this.state.image;
		var gyms = this.state.gyms;
		var page1 = page2 = page3 = null;
		var submitButton = null;

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
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
						underlineColorAndroid='transparent'
						onChangeText={(phone) => this.setState({phone})}
						value={this.state.phone} />
				</View>
				<View style={styles.inputRow}>
					<Text style = {styles.hints}>Are you signing up as a trainer? </Text>
					<Switch
						onTintColor="#ff2e63"
						tintColor="#ff2e63"
						thumbTintColor="#08d9d6"
						value={this.state.trainer}
						onValueChange={(trainer) => this.setState({trainer})}
						/>
				</View>
			</View>
			);
		}else if(this.state.page == 2){
			page2 = (
			<View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.building}</FontAwesome>
					</Text>
					<Picker
						style={styles.picker}
						itemStyle={{height: 45, color: '#08d9d6'}}
					  	selectedValue={this.state.gym}
					  	onValueChange={(itemValue, itemIndex) => this.setState({gym: itemValue})}>
					  	<Picker.Item label="Pick a Gym (Scroll)" value= '' key='0'/>
					  	{gyms.map(function(gym){
					  		return (<Picker.Item label={gym.name} value={gym.key} key={gym.key}/>);
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
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
						underlineColorAndroid='transparent'
						onChangeText = {(bio) => this.setState({bio})}
						maxLength={200}
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
						placeholderTextColor='#08d9d6'
						underlineColorAndroid='transparent'
						onChangeText={(cert) => this.setState({cert})}
						value={this.state.cert}
						spellCheck={true} 
						maxLength={150}/>
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput
						placeholder="SSN (For Stripe Account)"
						returnKeyType="done"
						style={styles.input}
						placeholderTextColor='#08d9d6'
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
						placeholderTextColor='#08d9d6'
						underlineColorAndroid='transparent'
						onChangeText={(birthDay) => this.setState({birthDay})}
						value={this.state.birthDay}/>
				</View>
			</View>
			);
		}else{
			nextButton = null;
			
			if(image != 'null'){
				page3 = (
					<View style={styles.imageContainer}>
						<Image source={{ uri: image }} style={styles.imageHolder} />
						<TouchableOpacity style={styles.pictureButton} onPressIn={this._pickImage}>
							<Text style={styles.buttonText}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
						</TouchableOpacity>
					</View>);
			}else{
				page3 = (
					<View style={styles.imageContainer}>
						<View style={styles.imageHolder}>
							<TouchableOpacity style={styles.pictureButton} onPressIn={this._pickImage}>
								<Text style={styles.pictureIcon}><FontAwesome>{Icons.plusSquare}</FontAwesome></Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			}
			
			submitButton = (
			<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onSignUpPress}>
				<Text style={styles.buttonText}> Signup </Text>
			</TouchableOpacity>
			);
		}

		return (
			<View>
			<StatusBar barStyle="dark-content" />
				{page1}
				{page2}
				{page3}
				{prevButton}
				{nextButton}
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
		borderColor: '#ff2e63',
		width: '90%',
		color: '#08d9d6'
	},
	picker: {
		height: 45,
		borderWidth: 1,
		borderColor: '#ff2e63',
		width: '90%',
	},
	buttonContainer: {
		backgroundColor: '#ff2e63',
		paddingVertical: 15,
		marginTop: 5,
	},
	pictureButton: {
		backgroundColor: '#ff2e63',
		width: 40,
		height: 40,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	pictureIcon: {
		color: '#FAFAFA',
		fontSize: 30,
		textAlign: 'center'
	},
	buttonText: {
		fontSize: 20,
		textAlign: 'center',
		color: '#FAFAFA',
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
		borderColor: '#ff2e63',
	},
	icon: {
		color: '#ff2e63',
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	hints:{
		color: '#08d9d6',		
		marginBottom: 10,
		marginRight: 10
	}
});