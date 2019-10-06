import React, { Component } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import firebase from 'firebase';
import { Icons } from 'react-native-fontawesome';
import { AppLoading } from 'expo';
import bugsnag from '@bugsnag/expo';
import { loadGym, loadUser } from '../components/Functions';
import  TextField from '../components/TextField';
var stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');

export class OwnerCardModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if (!this.state.gym) {
			try {
				const gym = await loadGym(this.props.gym);
				this.setState({ gym });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the card modal. Please try again later.');
				this.props.hide();
			}
		}
	}

	addCard = async() => {
		if(this.state.pressed){
			return;
		}
		this.state.pressed = true;

		const information = {
			card: {
				number: this.state.number.trim(),
				exp_month: this.state.expMonth,
				exp_year: this.state.expYear,
				cvc: this.state.cvc,
				name: this.state.name,
				currency: 'usd'
			}

		}

		let card;
		try {
			card = await stripe.createToken(information);
		} catch(error) {
			this.state.pressed = false;
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error creating a token for the card. Please check your information and try again.');
			return;
		}
		
		const user = firebase.auth().currentUser;
		try {
			const idToken = await firebase.auth().currentUser.getIdToken(true);
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/addTrainerCard/', {
				method: 'POST',
				headers: {
					Authorization: idToken
				},
				body: JSON.stringify({
					token: card,
					id: this.state.gym.stripeId,
					user: user.uid
				})
			})
			const response = await res.json();
			const data = JSON.parse(response.body);
			if(data.message !== 'Success'){
				throw new Error('Stripe Error');
			}
			
			await firebase.database().ref('users').child(user.uid).update({
				cardAdded: true
			});
			this.props.hide();
		} catch(error){
			this.state.pressed = false;
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error adding the card. Please check the info and make sure it is a debit card before trying again.');
			return;
		}
	}

	render(){
		if (!this.state.gym) {
			return <AppLoading />
		}
		return(
			<KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
				<Text style={styles.title}>Add Card</Text>
				<TextField
					icon={Icons.user}
					placeholder="Name"
					onChange={(name) => this.setState({ name })}
					value={this.state.name}
				/>
				<TextField
					icon={Icons.creditCard}
					placeholder="Card Number"
					keyboard="number-pad"
					onChange={(number) => this.setState({ number })}
					value={this.state.number}
				/>
				<TextField
					icon={Icons.calendar}
					placeholder="Expiration Month (mm)"
				  keyboard="number-pad"
					onChange={(expMonth) => this.setState({ expMonth })}
					value={this.state.expMonth}
				/>
				<TextField
					icon={Icons.calendar}
					placeholder="Expiration Year (yy)"
					keyboard="number-pad"
					onChange={(expYear) => this.setState({ expYear })}
					value={this.state.expYear}
				/>
				<TextField
					icon={Icons.lock}
					placeholder="CVC Code"
					onChange={(cvc) => this.setState({ cvc })}
					value={this.state.cvc}
				/>
				<TouchableOpacity style={styles.submitButton} onPressIn={() => this.addCard()}>
					<Text style={styles.buttonText}> Add Card </Text>
				</TouchableOpacity>
			</KeyboardAvoidingView>
		);
	}
}

const styles = StyleSheet.create({
	formContainer: {
		flex: 0.6,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fafafa',
		borderRadius: 10,
		padding: 20
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
	title: {
		color: '#0097A7',
		fontSize: 30,
		marginTop: 5,
		marginBottom: 10,
		textDecorationLine: 'underline'
	}
})