import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import * as Font from 'expo-font';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
import { OwnerCardModal } from '../modals/OwnerCardModal';
import { loadUser, loadGym } from '../components/Functions';

export class OwnerPage extends Component {

	constructor(props) {
		super(props);
		this.state = {}
	}

	async componentDidMount() {
		await Font.loadAsync({
			fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		let gym = await loadGym(this.props.gym);
		let user = await loadUser(firebase.auth().currentUser.uid);
		let cards = await this.loadTrainerCards(gym.stripeId);
		let balance = await this.getBalance(user.stripeId);
		this.setState({ cards, balance, user, pendingTrainers: gym.pendingtrainers, trainers: gym.trainers, gym })
	}

	loadTrainerCards = async(stripeId) => {
		if (stripeId === undefined) {
			return [];
		}
		try {
			const idToken = await firebase.auth().currentUser.getIdToken(true);
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/listTrainerCards/', {
				method: 'POST',
				headers: {
					Authorization: idToken
				},
				body: JSON.stringify({
					id: stripeId,
					user: firebase.auth().currentUser.uid
				}),
			});
			const data = await res.json();
			data.body = JSON.parse(data.body);
			if (data.body.message == "Success" && data.body.cards !== undefined) {
				return data.body.cards.data;
			}
		} catch (error) {
			console.log(error);
		}
		return [];
	}

	async getBalance(stripeId) {
		try {
			var user = firebase.auth().currentUser;
			const idToken = await firebase.auth().currentUser.getIdToken(true);
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/getBalance/', {
				method: 'POST',
				headers: {
					Authorization: idToken
				},
				body: JSON.stringify({
					id: stripeId,
					user: user.uid
				}),
			});
			const data = await res.json();
			data.body = JSON.parse(data.body);
			if (data.body.message = "Success") {
				if (data.body.balance !== undefined) {
					return data.body.balance.available[0].amount + data.body.balance.pending[0].amount;;
				}
			}
			return 0;
		} catch (error) {
			console.log(error);
			return 0;
		}
	}

	async deleteTrainerCard(stripeId, cardId, index) {
		if (this.state.cards.length == 1) {
			Alert.alert("You must have at least one card on file. Add another one before deleting this card.");
			return;
		}
		Alert.alert(
			'Are you sure you want to delete this card?',
			'',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						try {
							const idToken = await firebase.auth().currentUser.getIdToken(true);
							const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/deleteTrainerCard/', {
								method: 'POST',
								headers: {
									Authorization: idToken
								},
								body: JSON.stringify({
									stripeId: stripeId,
									cardId: cardId,
									user: firebase.auth().currentUser.uid
								}),
							});
							const data = await res.json();
							data.body = JSON.parse(data.body);
							if (data.body.message == "Success") {
								var cards = await this.loadTrainerCards(stripeId);
								this.setState({ cards: cards });
							} else {
								Alert.alert('There was an error. Please try again.');
							}
						} catch (error) {
							Alert.alert('There was an error. Please try again.');
						}
					}
				}
			]);
	}

	getCardIcon(brand) {
		if (brand == 'Visa') {
			return (<FontAwesome>{Icons.ccVisa}</FontAwesome>);
		} else if (brand == 'American Express') {
			return (<FontAwesome>{Icons.ccAmex}</FontAwesome>);
		} else if (brand == 'MasterCard') {
			return (<FontAwesome>{Icons.ccMastercard}</FontAwesome>);
		} else if (brand == 'Discover') {
			return (<FontAwesome>{Icons.ccDiscover}</FontAwesome>);
		} else if (brand == 'JCB') {
			return (<FontAwesome>{Icons.ccJcb}</FontAwesome>);
		} else if (brand == 'Diners Club') {
			return (<FontAwesome>{Icons.ccDinersClub}</FontAwesome>);
		} else {
			return (<FontAwesome>{Icons.creditCard}</FontAwesome>);
		}
	}

	async denyTrainer(trainerKey) {
		await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).remove();
		delete this.state.pendingTrainers[trainerKey];
		Alert.alert('Trainer denied');
	}

	async deleteTrainer(trainerKey) {
		await firebase.database().ref('users').child(trainerKey).update({ deleted: true });
		await firebase.database().ref('/gyms/' + this.props.gym + '/trainers/').child(trainerKey).remove();
		delete this.state.trainers[trainerKey];
		Alert.alert('Trainer removed from gym.');
	}

	async acceptTrainer(trainerKey) {
		await firebase.database().ref('users').child(trainerKey).update({ pending: false, stripeId: this.state.gym.stripeId });
		await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).once("value", function (snapshot) {
			firebase.database().ref('/gyms/' + this.props.gym + '/trainers/').child(trainerKey).set(snapshot.val());
		}.bind(this));
		await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).remove();
		delete this.state.pendingTrainers[trainerKey];
		const gym = await loadGym(this.props.gym);
		this.setState({pendingTrainers: gym.pendingtrainers, trainers: gym.trainers});
	}

	renderPending() {
		if (!this.state.pendingTrainers) {
			return (<Text style={styles.navText}>None</Text>);
		}
		var result = Object.keys(this.state.pendingTrainers).map(function (key) {
			var trainer = this.state.pendingTrainers[key];
			return (
				<View key={trainer.name} style={styles.traineeRow}>
					<Text style={{ width: 120 }}>{trainer.name}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.close}</FontAwesome> Deny</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => this.acceptTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.check}</FontAwesome> Accept</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	renderTrainers = () => {
		if (!this.state.trainers) {
			return (<Text style={styles.navText}>None</Text>);
		}
		var result = Object.keys(this.state.trainers).map(function (key) {
			var trainer = this.state.trainers[key];
			return (
				<View key={trainer.name} style={styles.traineeRow}>
					<Text style={{ width: 120 }}>{trainer.name}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.deleteTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.close}</FontAwesome> Remove</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.requestButton} onPress={() => Actions.OwnerHistoryPage({ userKey: key })}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.calendar}</FontAwesome> History</Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	logout = () => {
		Alert.alert(
			"Are you sure you wish to sign out?",
			"",
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: () => {
						firebase.auth().signOut().then(function () {
							Actions.reset('LoginPage');
						}, function (error) {
							Alert.alert('Sign Out Error', error);
						});
					}
				},
			],
		);
	}

	hideCardModal = () => {
		this.setState({ cardModal: false });
	}

	hideCardModalOnAdd = async() => {
		var cards = await this.loadTrainerCards(this.state.gym.stripeId);
		this.setState({ cardModal: false, cards: cards });
	}

	renderCards() {
		if (this.state.cards === undefined || this.state.cards.length == 0) {
			return (<Text style={{ marginTop: 10, fontSize: 20, color: COLORS.PRIMARY }}>No Cards Added</Text>);
		}
		var index = 0;
		var result = this.state.cards.map(function (currCard) {
			index++;
			return (
				<View style={styles.cardRow} key={currCard.id}>
					<Text style={styles.icon}>{this.getCardIcon(currCard.brand)}</Text>
					<Text>•••••• {currCard.last4}</Text>
					<Text>{currCard.exp_month.toString()} / {currCard.exp_year.toString().substring(2, 4)}</Text>
					<TouchableOpacity style={styles.deleteButton} onPress={() => this.deleteTrainerCard(this.state.gym.stripeId, currCard.id, index)}>
						<Text style={{ fontSize: 15, color: COLORS.WHITE }}><FontAwesome>{Icons.remove}</FontAwesome></Text>
					</TouchableOpacity>
				</View>
			);
		}.bind(this));
		return result;
	}

	render() {
		if (!this.state.user || !this.state.gym) {
			return <AppLoading />
		} else {
			if (this.state.currentTab == 'pending') {
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'pending' })}>
							<Text style={styles.activeText}>Pending Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'current' })}>
							<Text style={styles.navText}>Current Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<View style={styles.trainerContainer}>
						<ScrollView style={{ width: '90%' }} showsVerticalScrollIndicator={false}>
							{this.renderPending()}
						</ScrollView>
					</View>
				);
			} else {
				var navBar = (
					<View style={styles.navigationBar}>
						<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'pending' })}>
							<Text style={styles.navText}>Pending Trainers</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'current' })}>
							<Text style={styles.activeText}>Current Trainers</Text>
						</TouchableOpacity>
					</View>
				);
				var content = (
					<View style={styles.trainerContainer}>
						<ScrollView style={{ width: '90%' }} showsVerticalScrollIndicator={false}>
							{this.renderTrainers()}
						</ScrollView>
					</View>
				);
			}
			if (this.state.balance == 0) {
				var balanceFormatted = "0.00"
			} else {
				var balanceFormatted = (parseInt(this.state.balance) / 100).toFixed(2);
			}
			return (
				<View style={styles.container}>
					<Text style={styles.backButton} onPress={this.logout}>
						<FontAwesome>{Icons.powerOff}</FontAwesome>
					</Text>
					<Text style={styles.title}>Trainers</Text>
					{navBar}
					{content}
					<Text style={styles.balanceText}>${balanceFormatted}</Text>
					<View style={styles.cardHolder}>
						{this.renderCards()}
					</View>
					<TouchableOpacity style={styles.button} onPress={() => this.setState({ cardModal: true })}>
						<Text style={styles.largeText}><FontAwesome>{Icons.creditCard}</FontAwesome> Add Card </Text>
					</TouchableOpacity>
					<Text style={{ fontSize: 20, textAlign: 'center', color: COLORS.PRIMARY, marginTop: 10 }}>Funds will be transfered daily</Text>
					<Modal
						isVisible={this.state.cardModal}
						onBackdropPress={this.hideCardModal}>
						<OwnerCardModal hide={this.hideCardModalOnAdd} gym={this.props.gym} />
					</Modal>
				</View>
			);
		}
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	trainerContainer: {
		flex: 0.5,
		width: '90%',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'flex-start'
	},
	title: {
		marginTop: 45,
		fontSize: 34,
		color: COLORS.PRIMARY,
		fontWeight: '700',
	},
	cardHolder: {
		flex: 0.2,
		marginTop: 10,
		backgroundColor: '#f6f5f5',
		width: '90%',
		borderRadius: 10,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	cardRow: {
		width: '95%',
		marginTop: 10,
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	navigationBar: {
		width: '100%',
		height: 100,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginTop: 5,
	},
	activeTab: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: '50%',
		height: 60,
		backgroundColor: COLORS.PRIMARY,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	inactiveTab: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: '50%',
		height: 60,
		backgroundColor: COLORS.WHITE,
		borderWidth: 1,
		borderColor: COLORS.SECONDARY
	},
	navText: {
		fontSize: 25,
		color: COLORS.PRIMARY,
		textAlign: 'center'
	},
	balanceText: {
		fontSize: 30,
		marginTop: 15,
		color: COLORS.PRIMARY,
		textAlign: 'center'
	},
	activeText: {
		fontSize: 25,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
	traineeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		marginTop: 10
	},
	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35,
		color: COLORS.SECONDARY,
	},
	button: {
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		width: '50%',
		height: 50,
		marginTop: 10
	},
	deleteButton: {
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30
	},
	buttonText: {
		fontSize: 15,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
	largeText: {
		fontSize: 30,
		color: COLORS.WHITE,
		textAlign: 'center'
	},
	requestButton: {
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 80,
		height: 40,
		marginLeft: 10
	},
	denyButton: {
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 80,
		height: 40,
	},
	icon: {
		fontSize: 15
	},
});