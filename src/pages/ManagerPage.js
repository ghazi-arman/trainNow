import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Image, KeyboardAvoidingView } from 'react-native';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import  TextField from '../components/TextField';
import { ManagerCardModal } from '../modals/ManagerCardModal';
import { loadUser, loadGym, loadTrainerCards, loadBalance, deleteTrainerCard, getCardIcon, setDefaultTrainerCard } from '../components/Functions';
const loading = require('../images/loading.gif');

export class ManagerPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			cardModal: false,
			rateModal: false
		}
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		try {
			let gym = await loadGym(this.props.gym);
			let user = await loadUser(firebase.auth().currentUser.uid);
			let cards = await loadTrainerCards(user.stripeId);
			let balance = await loadBalance(user.stripeId);
			this.setState({ cards, balance, user, gym });
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error loading the dashboard. Try again later');
			this.logout();
		}
	}

	deleteTrainerCard = async(stripeId, cardId, defaultCard) => {
		if (defaultCard) {
			Alert.alert("You cannot delete your default card. Email use to remove your account.");
			return;
		}
		Alert.alert(
			'Delete Card',
			'Are you sure you want to delete this card?',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						try {
							await deleteTrainerCard(stripeId, cardId);
							const cards = await loadTrainerCards(stripeId);
							this.setState({ cards });
						} catch (error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error. Please try again later.');
						}
					}
				}
			]
		);
	}

	denyTrainer = async(trainerKey) => {
		try {
			await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).remove();
			delete this.state.gym.pendingtrainers[trainerKey];
			Alert.alert('Trainer denied');
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error when trying to deny that trainer.');
		}
	}

	deleteTrainer = async(trainerKey) => {
		Alert.alert(
			'Remove Trainer',
			'Are you sure you want to remove this trainer?',
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: async () => {
						try {
							await firebase.database().ref('users').child(trainerKey).update({ deleted: true });
							await firebase.database().ref('/gyms/' + this.props.gym + '/trainers/').child(trainerKey).remove();
							delete this.state.gym.trainers[trainerKey];
							Alert.alert('Trainer removed from gym.');
						} catch(error) {
							this.bugsnagClient.notify(error);
							Alert.alert('There was an error when trying to delete that trainer.');
						}
					}
				}
			]
		);
	}

	acceptTrainer = async(trainerKey) => {
		try {
			await firebase.database().ref('users').child(trainerKey).update({ pending: false, stripeId: this.state.user.stripeId });
			await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).once("value", (snapshot) => {
				firebase.database().ref('/gyms/' + this.props.gym + '/trainers/').child(trainerKey).set(snapshot.val());
			});
			await firebase.database().ref('/gyms/' + this.props.gym + '/pendingtrainers/').child(trainerKey).remove();
			delete this.state.gym.pendingtrainers[trainerKey];
			const gym = await loadGym(this.props.gym);
			this.setState({ gym });
			Alert.alert('Trainer added to gym. Please set the trainer rate immediately as it defaults to 50.');
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error when accepting that trainer.');
		}
	}

	renderPending = () => {
		if (!this.state.gym.pendingtrainers) {
			return (<Text style={styles.navText}>None</Text>);
		}
		return Object.keys(this.state.gym.pendingtrainers).map((key) => {
			const trainer = this.state.gym.pendingtrainers[key];
			trainer.key = key;
			return (
				<View key={trainer.name} style={styles.clientRow}>
					<Text style={styles.nameText}>{trainer.name}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.denyTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome name="close" size={18} /></Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.acceptButton} onPress={() => this.acceptTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome name="check" size={18} /></Text>
					</TouchableOpacity>
				</View>
			);
		});
	}

	renderTrainers = () => {
		if (!this.state.gym.trainers) {
			return (<Text style={styles.navText}>None</Text>);
		}
		return Object.keys(this.state.gym.trainers).map((key) => {
			const trainer = this.state.gym.trainers[key];
			trainer.key = key;
			return (
				<View key={trainer.name} style={styles.clientRow}>
					<Text style={styles.nameText}>{trainer.name} - ${trainer.rate}</Text>
					<TouchableOpacity style={styles.denyButton} onPress={() => this.deleteTrainer(key)}>
						<Text style={styles.buttonText}><FontAwesome name="close" size={18} /></Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.acceptButton} onPress={() => this.setState({ selectedTrainer: trainer, rateModal: true})}>
						<Text style={styles.buttonText}><FontAwesome name="dollar" size={18} /></Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.historyButton} onPress={() => Actions.ManagerHistoryPage({ userKey: key })}>
						<Text style={styles.buttonText}><FontAwesome name="calendar" size={18} /></Text>
					</TouchableOpacity>
				</View>
			);
		});
	}

	async setDefaultTrainerCard(stripeId, cardId){
		Alert.alert(
			'Are you sure you want to make this your default card?', 
			'',
			[
				{text: 'No'},
				{text: 'Yes', onPress: async () => {
					try {
						await setDefaultTrainerCard(stripeId, cardId);
						const cards = await loadTrainerCards(stripeId);
						this.setState({ cards });
					}catch(error) {
						this.bugsnagClient.notify(error);
						Alert.alert('There was an error. Please try again.');
					}
				}}
			]
		);
	}

	logout = () => {
		Alert.alert(
			"Log Out",
			"Are you sure you wish to log out?",
			[
				{ text: 'No' },
				{
					text: 'Yes', onPress: () => {
						firebase.auth().signOut().then(() => {
							Actions.reset('LoginPage');
						}, (error) => {
							this.bugsnagClient.notify(error);
							Actions.reset('LoginPage');
						});
					}
				},
			],
		);
	}

	hideRateModal = () => this.setState({ rateModal: false, selectedTrainer: null });

	hideCardModal = () => this.setState({ cardModal: false });

	hideCardModalOnAdd = async() => {
		var cards = await loadTrainerCards(this.state.user.stripeId);
		this.setState({ cardModal: false, cards });
	}

	renderCards = () => {
		if (!this.state.cards || !this.state.cards.length) {
			return (<Text style={{ marginTop: 10, fontSize: 20, color: COLORS.PRIMARY }}>No Cards Added</Text>);
		}
		let index = 0;
		return this.state.cards.map((currCard) => {
			index++;
			let defaultButton;
			let defaultCard = false;
			if (currCard.default_for_currency) {
				defaultButton = (<Text style={styles.greenIcon}><FontAwesome name="check-circle" size={20} /></Text>);
				defaultCard = true;
			} else {
				defaultButton = (
					<TouchableOpacity style={styles.defaultButton} onPress={() => this.setDefaultTrainerCard(this.state.user.stripeId, currCard.id)}>
							<Text style={{color: COLORS.WHITE}}><FontAwesome name="check" size={15} /></Text>
						</TouchableOpacity>
				);
			}
			return (
				<View style={styles.cardRow} key={currCard.id}>
					<Text style={styles.icon}>{getCardIcon(currCard.brand)}</Text>
					<Text>•••••• {currCard.last4}</Text>
					{defaultButton}
					<Text>{currCard.exp_month.toString()} / {currCard.exp_year.toString().substring(2, 4)}</Text>
					<TouchableOpacity style={styles.deleteButton} onPress={() => this.deleteTrainerCard(this.state.user.stripeId, currCard.id, defaultCard)}>
						<Text style={{color: COLORS.WHITE}}><FontAwesome name="remove" size={15} /></Text>
					</TouchableOpacity>
				</View>
			);
		});
	}

	updateRate = async() => {
		try {
			if (!this.state.rate || this.state.rate.replace(/\D/g,'') < 25) {
				Alert.alert("Please enter your rate (has to be $25+)!");
				return;
			}
			await firebase.database().ref(`/users/${this.state.selectedTrainer.key}/`).update({ rate: parseInt(this.state.rate) });
			await firebase.database().ref(`/gyms/${this.props.gym}/trainers/${this.state.selectedTrainer.key}`).update({ rate: parseInt(this.state.rate) });
			const gym = await loadGym(this.props.gym);
			this.setState({ gym });
			Alert.alert('Rate updated.');
		} catch(error) {
			this.bugsnagClient.notify(error);
			Alert.alert(`There was an error updating the trainer's rate.`);
		}
	}

	render() {
		if (!this.state.user || !this.state.gym || !this.state.cards || this.state.balance === undefined) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		if (this.state.currentTab === 'pending') {
			var navBar = (
				<View style={styles.navigationBar}>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'pending' })}>
						<Text style={styles.activeText}>Pending</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({ currentTab: 'current' })}>
						<Text style={styles.navText}>Trainers</Text>
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
						<Text style={styles.navText}>Pending</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.activeTab} onPress={() => this.setState({ currentTab: 'current' })}>
						<Text style={styles.activeText}>Trainers</Text>
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
			var balanceFormatted = (this.state.balance / 100).toFixed(2);
		}
		const trainerName = this.state.selectedTrainer ? this.state.selectedTrainer.name : 'None';
		return (
			<View style={styles.container}>
				<Text style={styles.backButton} onPress={this.logout}>
					<FontAwesome name="power-off" size={35} />
				</Text>
				<Text style={styles.title}>Trainers</Text>
				{navBar}
				{content}
				<Text style={styles.balanceText}>${balanceFormatted}</Text>
				<View style={styles.cardHolder}>
					{this.renderCards()}
				</View>
				<TouchableOpacity style={styles.button} onPress={() => this.setState({ cardModal: true })}>
					<Text style={styles.activeText}><FontAwesome name="credit-card" size={25} /> Add Card </Text>
				</TouchableOpacity>
				<Text style={{ fontSize: 20, textAlign: 'center', color: COLORS.PRIMARY, marginTop: 10 }}>Funds will be transfered daily</Text>
				<Modal
					isVisible={this.state.cardModal}
					onBackdropPress={this.hideCardModal}>
					<ManagerCardModal hide={this.hideCardModalOnAdd} gym={this.props.gym} />
				</Modal>
				<Modal 
					isVisible={this.state.rateModal}
					onBackdropPress={this.hideRateModal}
				>
					<KeyboardAvoidingView behavior="padding" style={styles.cardModal}>
						<Text style={styles.closeButton} onPress={this.hideRateModal}>
							<FontAwesome name="close" size={35} />
						</Text>
						<Text style={styles.header}>{trainerName}</Text>
						<TextField
							icon="dollar"
							placeholder="Rate"
							keyboard="number-pad"
							onChange={(rate) => this.setState({ rate })}
							value={this.state.rate}
						/>
						<TouchableOpacity style={styles.submitButton} onPress={() => this.updateRate()}>
							<Text style={styles.buttonText}>Update Rate</Text>
						</TouchableOpacity>
					</KeyboardAvoidingView>
				</Modal>
			</View>
		);
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
	clientRow: {
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
	defaultButton: {
		backgroundColor: COLORS.GREEN,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30
	},
	greenIcon: {
		fontSize: 20,
		color: COLORS.GREEN
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
	denyButton: {
		backgroundColor: COLORS.RED,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30,
	},
	historyButton: {
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30,
	},
	acceptButton: {
		backgroundColor: COLORS.GREEN,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30,
	},
	icon: {
		fontSize: 15
	},
	loading: {
    width: '100%',
    resizeMode: 'contain'
	},
	loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
	},
	nameText: {
		fontSize: 18,
		fontWeight: '500',
		width: '50%',
		textAlign: 'center',
		color: COLORS.PRIMARY
	},
	closeButton: {
		position: 'absolute',
		top: 0,
		right: 0,
		fontSize: 35,
		color: COLORS.RED,
	},
	cardModal: {
		flex: 0.4,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
		padding: 20
	},
	submitButton: {
		borderRadius: 5,
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: 150,
		flexDirection: 'column',
		justifyContent: 'center'
	},
	header: {
		textAlign: 'center',
		fontSize: 30,
		fontWeight: '700',
		color: COLORS.PRIMARY,
	},
});