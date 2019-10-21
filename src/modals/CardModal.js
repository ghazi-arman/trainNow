import React, { Component } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import firebase from 'firebase';
import { AppLoading } from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import  TextField from '../components/TextField';
import bugsnag from '@bugsnag/expo';
import { loadUser } from '../components/Functions';
import Colors from '../components/Colors';
import { STRIPE_KEY } from 'react-native-dotenv';
const stripe = require('stripe-client')(STRIPE_KEY);

export class CardModal extends Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		//Get user info for state
		if(!this.state.user) {
			try {
				const user = await loadUser(firebase.auth().currentUser.uid);
				this.setState({ user });
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading the card modal.');
				this.props.hide();
			} 
		}
	}

	addCard = async () => {
		if (this.state.pressed) {
			return;
		}
		this.state.pressed = true;

		const information = {
			card: {
				number: this.state.number,
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
		const idToken = await firebase.auth().currentUser.getIdToken(true);
		if (!this.state.user.stripeId) {
			try {
				const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/createCustomer/', {
					method: 'POST',
					headers: {
						Authorization: idToken
					},
					body: JSON.stringify({
						token: card,
						id: user.uid,
						email: user.email
					}),
				});
				const response = await res.json();
				const data = JSON.parse(response.body);
				if (data.message !== 'Success') {
					throw new Error('Stripe Error');
				}

				await firebase.database().ref('users').child(user.uid).update({
					stripeId: data.customer.id,
					cardAdded: true
				});
				this.props.hide();
			} catch (error) {
				this.state.pressed = false;
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error adding the card. Please try again.');
				return;
			}
		} else {
			if (this.state.user.trainer) {
				try {
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/addTrainerCard/', {
						method: 'POST',
						headers: {
							Authorization: idToken
						},
						body: JSON.stringify({
							token: card,
							id: this.state.user.stripeId,
							user: user.uid
						})
					})
					const response = await res.json();
					const data = JSON.parse(response.body);
					if (data.message !== 'Success') {
						throw new Error('Stripe Error');
					}

					await firebase.database().ref('users').child(user.uid).update({
						cardAdded: true
					});
					this.props.hide();
				} catch (error) {
					this.state.pressed = false;
					this.bugsnagClient.notify(error);
					Alert.alert('There was an error adding the card. Please check the info and make sure it is a debit card before trying again.');
					return;
				}
			} else {
				try {
					const idToken = await firebase.auth().currentUser.getIdToken(true);
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/addCard/', {
						method: 'POST',
						headers: {
							Authorization: idToken
						},
						body: JSON.stringify({
							token: card,
							id: this.state.user.stripeId,
							user: user.uid
						}),
					});
					const response = await res.json();
					const data = JSON.parse(response.body);
					if (data.message !== 'Success') {
						throw new Error('Stripe Error');
					}
					
					await firebase.database().ref('users').child(user.uid).update({
						cardAdded: true
					});
					this.props.hide();
				} catch (error) {
					this.state.pressed = false;
					this.bugsnagClient.notify(error);
					Alert.alert('There was an error adding the card. Please try again.');
				}
			}

		}
	}

	render() {
		if (!this.state.user) {
			return <AppLoading />
		}
		return (
			<KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
				<Text style={styles.closeButton} onPress={this.props.hide}>
					<FontAwesome>{Icons.close}</FontAwesome>
				</Text>
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
					icon={Icons.calendar}
					placeholder="CVC Code"
					keyboard="number-pad"
					onChange={(cvc) => this.setState({ cvc })}
					value={this.state.cvc}
				/>
				<TouchableOpacity style={styles.submitButton} onPressIn={() => this.addCard()}>
					<Text style={styles.buttonText}>
						Add Card
					</Text>
				</TouchableOpacity>
			</KeyboardAvoidingView>
		)
	}
}

const styles = StyleSheet.create({
	formContainer: {
		flex: 0.9,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: Colors.WHITE,
		borderRadius: 10,
		padding: 20
	},
	submitButton: {
		borderRadius: 5,
		backgroundColor: Colors.SECONDARY,
		paddingVertical: 15,
		width: 150,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	buttonText: {
		fontSize: 20,
		textAlign: 'center',
		color: Colors.WHITE,
		fontWeight: '700'
	},
	closeButton: {
		position: 'absolute',
		top: 5,
		right: 5,
		fontSize: 35,
		color: Colors.RED,
	},
	title: {
		color: Colors.PRIMARY,
		fontSize: 30,
		fontWeight: '700'
	}
})