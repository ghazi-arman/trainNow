import React, { Component } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Alert, Linking } from 'react-native';
import { Actions } from 'react-native-router-flux';
import * as Font from 'expo-font';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import COLORS from '../components/Colors';
var stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');

export class OwnerSignupForm extends Component {
	
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
			gymKey:'',
			ssn:'',
			taxId:'',
		}; 

		this.onSignUpPress=this.onSignUpPress.bind(this);
		this.goNext=this.goNext.bind(this);
		this.goBack=this.goBack.bind(this);
	}

	async componentDidMount() {
		if(!this.state.fontLoaded){
			this.loadFont();
		}
	}

	loadFont = async () => {
		await Font.loadAsync({
	      FontAwesome: require('../fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
	      fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
	    });
	    this.setState({fontLoaded: true});
	}

	async onSignUpPress() {
		// client side authentication
		if(this.state.pressed){
			return;
		}
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
		this.state.pressed = true;
		var name = this.state.name;
		var nameSplit = name.split(" ");
		var firstName = nameSplit[0];
		var lastName = nameSplit[1];
		var email = this.state.email;
		var phone = this.state.phone;
		var pw = this.state.password;
		var cpw = this.state.confirmPass;
		var gymKey = this.state.gymKey;
		var taxId = {
			pii: {
				tax_id: this.state.taxId
			}
		}
		var ssn = {
			pii: {
				personal_id_number: this.state.ssn
			}
		}

		try {
			var taxTok = await stripe.createToken(taxId);
		}catch(error){
			this.state.pressed = false;
			Alert.alert('Invalid Tax Id entered. Please check your info and try again!');
			return;
		}
		try {
			var ssnTok = await stripe.createToken(ssn);
		}catch(error){
			this.state.pressed = false;
			Alert.alert('Invalid Social Security entered. Please check your info and try again!');
			return;
		}

		var date = this.state.birthDay;
		var dateSplit = date.split("/");
		var taxToken = taxTok.id;
		var ssnToken = ssnTok.id;
		var month = dateSplit[0];
		var day = dateSplit[1];
		var year = dateSplit[2];
		var address = this.state.address;
		var city = this.state.city;
		var state = this.state.state;
		var zip = this.state.zip;
		var company = this.state.companyName;
    	try {
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createOwner/', {
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
					ssnToken: ssnToken,	
					taxToken: taxToken,
					company: company,
					day: day,
					month: month,
					year: year
				}),
			});
			const data = await res.json();
		    data.body = JSON.parse(data.body);
		    console.log(data.body);
		    if(data.body.message == 'Success'){
			    firebase.auth().createUserWithEmailAndPassword(this.state.email, pw)
				.then(async function(firebaseUser) {
					var userRef = firebase.database().ref('users');
					userRef.child(firebaseUser.uid).set({
						owner: true,
						name: name,
				    	gym: gymKey,
			      		phone: phone,
			      		stripeId: data.body.trainer.account,
			      		pending: true,
			      		cardAdded: false
			    	});
					firebase.auth().signInWithEmailAndPassword(this.state.email, this.state.password).then(function() {
						Actions.reset('LoginPage');
						Alert.alert('You must enter a debit card for payouts before trainees can book a sessions at your gym!');
					});
				}.bind(this)).catch(function(error) {
					var errorMessage = error.message;
					this.state.pressed = false;
					Alert.alert(errorMessage);
					return;
				}.bind(this));
			}else{
				this.state.pressed = false;
				Alert.alert('There was an error creating your stripe Account. Please review your email, address, birthday, and ssn and try again!');
				return;
			}
		}catch(error) {
			this.state.pressed = false;
			Alert.alert('There was an error creating your stripe Account. Please review your email, address, birthday, and ssn and try again!');
			return;
		}
	}

	goBack(){
		if(this.state.page == 2){
			this.setState({page: 1});
		}else if(this.state.page == 3){
			this.setState({page: 2});
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

			this.setState({page: 2});

		}else if(this.state.page == 2){

			if(!this.state.companyName.length){
				Alert.alert("Please enter a company name");
				return;
			}
			if(!this.state.gymKey.length){
				Alert.alert("Please enter a gym Key!");
				return;
			}
			if(!this.state.ssn.length){
				Alert.alert("Please enter your Social Security Number!");
				return;
			}
			if(!this.state.taxId.length){
				Alert.alert("Please enter your Company Tax ID!");
				return;
			}
			if(!this.state.birthDay.length){
				Alert.alert("Please fill out your birthday!");
				return;
			}

			this.setState({page: 3});
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
			</View>
			);
		}else if(this.state.page == 2){
			page2 = (
			<View style={styles.container}>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.building}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Company Name (For Stripe Account)"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(companyName) => this.setState({companyName})}
						value={this.state.companyName} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.building}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Gym Key"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(gymKey) => this.setState({gymKey})}
						value={this.state.gymKey} />
				</View>
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.user}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Company Tax ID (For Stripe Account)"
						returnKeyType="done"
						style={styles.input}
						placeholderTextColor={COLORS.PRIMARY}
						underlineColorAndroid='transparent'
						onChangeText={(taxId) => this.setState({taxId})}
						value={this.state.taxId}
						keyboardType="number-pad"/>
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
			nextButton = null;
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