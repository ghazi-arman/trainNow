import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, KeyboardAvoidingView, TextInput, TouchableOpacity, Alert, DatePickerIOS, Picker} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { AppLoading} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
var stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');
console.ignoredYellowBox = ['Setting a timer'];

export class CardModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			user: 'null',
			name: '',
			number: '',
			expiration: '',
			cvc: '',
		};
		this.addCard = this.addCard.bind(this);
	}

	componentDidMount(){
		//Get user info for state
	    var user = firebase.auth().currentUser;
	    var usersRef = firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', function(snapshot) {
	    	this.setState({user: snapshot.val()});
	    }.bind(this));
	}

	addCard = async() => {
		var information = {
			card: {
				number: this.state.number,
				exp_month: this.state.expMonth,
				exp_year: this.state.expYear,
				cvc: this.state.cvc,
				name: this.state.name,
			}

		}
		if(this.state.user.trainer){
			information.card.currency = 'usd';
		}
		var user = firebase.auth().currentUser;
	    var card = await stripe.createToken(information);
		if(this.state.user.stripeId === undefined){
			try {
		      const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/createCustomer/', {
		        method: 'POST',
		        body: JSON.stringify({
		          token: card,
		          id: user.uid,
		          email: user.email
		        }),
		      });
		      const data = await res.json();
		      data.body = JSON.parse(data.body);

		      console.log(data.body);
		      var userRef = firebase.database().ref('users');
		      userRef.child(user.uid).update({
		        stripeId: data.body.customer.id
		      });
		      this.props.hide();
		    } catch(error){
		      console.log(error);
		    }
		}else{
			if(this.state.user.trainer){
				try {
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/addTrainerCard/', {
						method: 'POST',
						body: JSON.stringify({
							token: card,
							id: this.state.user.stripeId
						})
					})
					const data = await res.json();
					data.body = JSON.parse(data.body);
					console.log(data.body);
					this.props.hide();
				} catch(error){
					console.log(error);
				}
			}else{
				try {
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/addCard/', {
						method: 'POST',
						body: JSON.stringify({
							token: card,
							id: this.state.user.stripeId,
						}),
					});
					const data = await res.json();
					data.body = JSON.parse(data.body);
					console.log(data.body);
					this.props.hide();
				} catch(error){
					console.log(error);
				}
			}
			
		}
	}

	render(){
		if(this.state.user == 'null' || typeof this.state.user == undefined){
			return <Expo.AppLoading />
		}else{
			return(
				<KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
					<Text style={styles.title}>Add Card</Text>
					<View style={styles.inputRow}>
						<Text style={styles.icon}>
							<FontAwesome>{Icons.user}</FontAwesome>
						</Text>
						<TextInput 
							placeholder="Name"
							style={styles.input}
							returnKeyType="next"
							placeholderTextColor='#0097A7'
							underlineColorAndroid='transparent'
							onChangeText={(name) => this.setState({name})}
							value={this.state.name} />
					</View>
		            <View style={styles.inputRow}>
						<Text style={styles.icon}>
							<FontAwesome>{Icons.creditCard}</FontAwesome>
						</Text>
						<TextInput 
							placeholder="Card Number"
							keyboardType="number-pad"
							returnKeyType="done"
							style={styles.input}
							placeholderTextColor='#0097A7'
							underlineColorAndroid='transparent'
							onChangeText={(number) => this.setState({number})}
							value={this.state.number} />
					</View>
					<View style={styles.inputRow}>
						<Text style={styles.icon}>
							<FontAwesome>{Icons.calendar}</FontAwesome>
						</Text>
						<TextInput 
							placeholder="Expiration Month (mm)"
							returnKeyType="done"
							keyboardType="number-pad"
							style={styles.input}
							placeholderTextColor='#0097A7'
							underlineColorAndroid='transparent'
							onChangeText={(expMonth) => this.setState({expMonth})}
							value={this.state.expiration} />
					</View>
					<View style={styles.inputRow}>
						<Text style={styles.icon}>
							<FontAwesome>{Icons.calendar}</FontAwesome>
						</Text>
						<TextInput 
							placeholder="Expiration Year (yy)"
							returnKeyType="done"
							keyboardType="number-pad"
							style={styles.input}
							placeholderTextColor='#0097A7'
							underlineColorAndroid='transparent'
							onChangeText={(expYear) => this.setState({expYear})}
							value={this.state.expiration} />
					</View>
					<View style={styles.inputRow}>
						<Text style={styles.icon}>
							<FontAwesome>{Icons.lock}</FontAwesome>
						</Text>
						<TextInput 
							placeholder="CVC Code"
							keyboardType="number-pad"
							returnKeyType="done"
							style={styles.input}
							placeholderTextColor='#0097A7'
							underlineColorAndroid='transparent'
							onChangeText={(cvc) => this.setState({cvc})}
							value={this.state.cvc} />
					</View>
		            <TouchableOpacity style={styles.submitButton} onPressIn={() => this.addCard()}>
		            	<Text style={styles.buttonText}>
		                  Add Card
		                </Text>
		            </TouchableOpacity>
	            </KeyboardAvoidingView>)
		}
	}
}

const styles = StyleSheet.create({
	formContainer: {
		flex: 0.6,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fafafa',
		borderRadius: 10
	},
	inputRow: {
		width: '80%',
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginBottom: 10
	},
	input: {
		height: 40,
		borderWidth: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderColor: '#0097A7',
		width: '90%',
		color: '#0097A7'
	},
	submitButton: {
		backgroundColor: '#0097A7',
		paddingVertical: 15,
		marginTop: 10,
		width: '50%',
		flexDirection: 'column',
		justifyContent: 'center'
	},
	buttonText: {
		fontSize: 20,
		textAlign: 'center',
		color: '#FAFAFA',
		fontWeight: '700'
	},
	icon: {
		color: '#0097A7',
		width: 40,
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	title: {
		color: '#0097A7',
		fontSize: 30,
		marginTop: 5,
		marginBottom: 10,
		textDecorationLine: 'underline'
	}
})