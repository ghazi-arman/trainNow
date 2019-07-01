import React, { Component } from 'react';
import { StyleSheet, Text, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import firebase from 'firebase';
import { AppLoading } from 'expo';
import { Icons } from 'react-native-fontawesome';
import  TextField from './components/TextField';
import COLORS from './Colors';
var stripe = require('stripe-client')('pk_test_6sgeMvomvrZFucRqYhi6TSbO');

export class CardModal extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		//Get user info for state
		var user = firebase.auth().currentUser;
		var usersRef = firebase.database().ref('users');
		usersRef.orderByKey().equalTo(user.uid).on('child_added', function (snapshot) {
			this.setState({ user: snapshot.val() });
		}.bind(this));
	}

	addCard = async () => {
		if (this.state.pressed) {
			return;
		}
		this.state.pressed = true;
		var information = {
			card: {
				number: this.state.number,
				exp_month: this.state.expMonth,
				exp_year: this.state.expYear,
				cvc: this.state.cvc,
				name: this.state.name,
			}

		}
		if (this.state.user.trainer) {
			information.card.currency = 'usd';
		}
		var user = firebase.auth().currentUser;
		var card = await stripe.createToken(information);
		if (this.state.user.stripeId === undefined) {
			const idToken = await firebase.auth().currentUser.getIdToken(true);
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
				const data = await res.json();
				data.body = JSON.parse(data.body);
				if (data.body.message == 'Success') {
					var userRef = firebase.database().ref('users');
					userRef.child(user.uid).update({
						stripeId: data.body.customer.id,
						cardAdded: true
					});
				} else {
					Alert.alert('There was an error adding the card. Please check the info and try again.');
					return;
				}
				this.props.hide();
			} catch (error) {
				Alert.alert('There was an error adding the card. Please try again.');
			}
		} else {
			if (this.state.user.trainer) {
				try {
					const idToken = await firebase.auth().currentUser.getIdToken(true);
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
					const data = await res.json();
					data.body = JSON.parse(data.body);
					console.log(data.body);
					if (data.body.message == 'Success') {
						var userRef = firebase.database().ref('users');
						userRef.child(user.uid).update({
							cardAdded: true
						});
					} else {
						Alert.alert('There was an error. Please check the info and make sure it is a debit card before trying again.');
						return;
					}
					this.props.hide();
				} catch (error) {
					Alert.alert('There was an error adding the card. Please check the info and make sure it is a debit card before trying again.');
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
					const data = await res.json();
					data.body = JSON.parse(data.body);
					if (data.body.message == 'Success') {
						var userRef = firebase.database().ref('users');
						userRef.child(user.uid).update({
							cardAdded: true
						});
					} else {
						Alert.alert('There was an error adding the card. Please check the info and try again.');
						return;
					}
					this.props.hide();
				} catch (error) {
					Alert.alert('There was an error adding the card. Please try again.');
				}
			}

		}
	}

	render() {
		if (!this.state.user) {
			return <AppLoading />
		} else {
			return (
				<KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
					<Text style={styles.title}>Add Card</Text>
					<TextField
						rowStyle={styles.inputRow}
						icon={Icons.user}
						placeholder="Name"
						color={COLORS.PRIMARY}
						onChange={(name) => this.setState({ name })}
						value={this.state.name}
					/>
					<TextField
						rowStyle={styles.inputRow}
						icon={Icons.creditCard}
						placeholder="Card Number"
						keyboard="number-pad"
						color={COLORS.PRIMARY}
						onChange={(number) => this.setState({ number })}
						value={this.state.number}
					/>
					<TextField
						rowStyle={styles.inputRow}
						icon={Icons.calendar}
						placeholder="Expiration Month (mm)"
						keyboard="number-pad"
						color={COLORS.PRIMARY}
						onChange={(expMonth) => this.setState({ expMonth })}
						value={this.state.expMonth}
					/>
					<TextField
						rowStyle={styles.inputRow}
						icon={Icons.calendar}
						placeholder="Expiration Year (yy)"
						keyboard="number-pad"
						color={COLORS.PRIMARY}
						onChange={(expYear) => this.setState({ expYear })}
						value={this.state.expYear}
					/>
					<TextField
						rowStyle={styles.inputRow}
						icon={Icons.calendar}
						placeholder="CVC Code"
						keyboard="number-pad"
						color={COLORS.PRIMARY}
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