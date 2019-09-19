import React, { Component } from 'react';
import { StyleSheet, Text, View, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import { Font } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import { CardModal } from '../modals/CardModal';
import COLORS from '../components/Colors';

export class PaymentPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			cardModal: false,
			user: 'null',
			cards: 'null', 
			balance: 'null',
		}
		this.renderCards=this.renderCards.bind(this);
		this.deleteCard=this.deleteCard.bind(this);
		this.hideCardModal=this.hideCardModal.bind(this);
		this.hideCardModalOnAdd=this.hideCardModalOnAdd.bind(this);
	}

	async componentDidMount() {
		await Font.loadAsync({
		  fontAwesome: require('../fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		//Get user info for state
	    var user = firebase.auth().currentUser;
	    var usersRef = await firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', async function(snapshot) {
	    	var user = snapshot.val();
	    	if(user.type == 'managed'){
	    		Alert.alert('You do not have access to this page with a managed gym account');
	    		Actions.reset('MapPage');
	    		return;
	    	}
	    	if(user.trainer){
	    		var balance = await this.getBalance(user.stripeId);
	    		var cards = await this.loadTrainerCards(user.stripeId);
	    	}else{
	    		var cards = await this.loadCards(user.stripeId);
	    	}
	    	this.setState({user: user, cards: cards, balance: balance});
	    }.bind(this));
	}

	goToMap(){
		Actions.MapPage();
	}

	hideCardModal(){
		this.setState({cardModal: false});
	}

	async hideCardModalOnAdd(){
		if(this.state.user.trainer){
			var cards = await this.loadTrainerCards(this.state.user.stripeId);
		}else{
			var cards = await this.loadCards(this.state.user.stripeId);
		}
		this.setState({cardModal: false, cards: cards});
	}

	getCardIcon(brand){
		if(brand == 'Visa'){
			return (<FontAwesome>{Icons.ccVisa}</FontAwesome>);
		}else if(brand == 'American Express'){
			return (<FontAwesome>{Icons.ccAmex}</FontAwesome>);
		}else if(brand == 'MasterCard'){
			return (<FontAwesome>{Icons.ccMastercard}</FontAwesome>);
		}else if(brand == 'Discover'){
			return (<FontAwesome>{Icons.ccDiscover}</FontAwesome>);
		}else if(brand == 'JCB'){
			return (<FontAwesome>{Icons.ccJcb}</FontAwesome>);
		}else if(brand == 'Diners Club'){
			return (<FontAwesome>{Icons.ccDinersClub}</FontAwesome>);
		}else{
			return (<FontAwesome>{Icons.creditCard}</FontAwesome>);
		}
	}

	async loadCards(stripeId) {
		if(stripeId === undefined){
			return [];
		}
		try {
			const idToken = await firebase.auth().currentUser.getIdToken(true);
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/listCards/', {
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
			if(data.body.message == "Success"){
				if(data.body.cards === undefined){
					return [];
				}
				return data.body.cards.data;
			}else{
				Alert.alert('There was an error. Please try again');
			}
		}catch(error){
			Alert.alert('There was an error. Please try again');
		}
	}

	async loadTrainerCards(stripeId){
		if(stripeId === undefined){
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
			if(data.body.message == "Success" && data.body.cards !== undefined){
				return data.body.cards.data;
			}
		}catch(error){
			console.log(error);
		}
		return [];
	}

	async deleteCard(stripeId, cardId, index){
		Alert.alert(
	      'Are you sure you want to delete this card?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: async () => {
				try {
					const idToken = await firebase.auth().currentUser.getIdToken(true);
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/deleteCard/', {
							method: 'POST',
							headers:{
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
						if(data.body.message == "Success"){
							var cards = await this.loadCards(stripeId);
							if(cards.length == 0){
								console.log('true');
								var usersRef = await firebase.database().ref('users');
								usersRef.child(firebase.auth().currentUser.uid).update({
									cardAdded: false
								});
						}
						this.setState({cards: cards});
					}else{
						Alert.alert('There was an error. Please try again.');
					}
				}catch(error){
					Alert.alert('There was an error. Please try again');
				}
			}}
		]);
	}

	async deleteTrainerCard(stripeId, cardId, index){
		if(this.state.cards.length == 1){
			Alert.alert("You must have at least one card on file. Add another one before deleting this card.");
			return;
		}
		Alert.alert(
	      'Are you sure you want to delete this card?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: async () => {
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
					if(data.body.message == "Success"){
						var cards = await this.loadTrainerCards(stripeId);
						this.setState({cards: cards});
					}else{
						Alert.alert('There was an error. Please try again.');
					}
				}catch(error){
					Alert.alert('There was an error. Please try again.');
				}
			}}
		]);
	}

	async getBalance(stripeId){
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
		    if(data.body.message = "Success"){
		    	var result = 0;
		    	if(data.body.balance !== undefined){
		    		return data.body.balance.available[0].amount + data.body.balance.pending[0].amount;;
		    	}
		    }
		    return 0;
		}catch(error) {
			console.log(error);
			return 0;
		}
	}

	async setDefaultCard(stripeId, cardId){
		Alert.alert(
	      'Are you sure you want to make this your default card?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: async () => {
				try {
					var user = firebase.auth().currentUser;
					const idToken = await firebase.auth().currentUser.getIdToken(true);
					const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/fb/stripe/setDefault/', {
						method: 'POST',
						headers: {
							Authorization: idToken
						},
						body: JSON.stringify({
							id: stripeId,
							card: cardId,
							user: user.uid
						}),
					});
					const data = await res.json();
					data.body = JSON.parse(data.body);
					if(data.body.message == "Success"){
						var cards = await this.loadCards(stripeId);
						this.setState({cards: cards});
					}else{
						Alert.alert('There was an error. Please try again.');
					}
				}catch(error) {
					Alert.alert('There was an error. Please try again.');
					console.log(error);
				}
			}}
		]);
	}

	renderCards(){
		if(this.state.cards === undefined || this.state.cards.length == 0){
			return (<Text style={{marginTop: 10, fontSize: 20, color: COLORS.PRIMARY}}>No Cards Added</Text>);
		}
		var index = 0;
		var result = this.state.cards.map(function(currCard){
			var deleteButton;
			var defaultButton;
			if(this.state.user.trainer){
				deleteButton = (
					<TouchableOpacity style={styles.deleteButton} onPress={() => this.deleteTrainerCard(this.state.user.stripeId, currCard.id, index)}>
	    				<Text style={{fontSize: 15, color: COLORS.WHITE}}><FontAwesome>{Icons.remove}</FontAwesome></Text>
	    			</TouchableOpacity>
				);
			}else{
				if(index == 0){
					defaultButton = (<FontAwesome style={styles.greenIcon}>{Icons.checkCircle}</FontAwesome>);
				}else{
					defaultButton = (
						<TouchableOpacity style={styles.defaultButton} onPress={() => this.setDefaultCard(this.state.user.stripeId, currCard.id)}>
	    					<Text style={{fontSize: 15, color: COLORS.WHITE}}><FontAwesome>{Icons.check}</FontAwesome></Text>
	    				</TouchableOpacity>
					);
				}
				deleteButton = (
					<TouchableOpacity style={styles.deleteButton} onPress={() => this.deleteCard(this.state.user.stripeId, currCard.id, index)}>
	    				<Text style={{fontSize: 15}}><FontAwesome>{Icons.remove}</FontAwesome></Text>
	    			</TouchableOpacity>
				);
			}
			index++;
    		return(
    			<View style={styles.cardRow} key={currCard.id}>
	    			<Text style={styles.icon}>{this.getCardIcon(currCard.brand)}</Text>
	    			<Text>•••••• {currCard.last4}</Text>
	    			<Text>{currCard.exp_month.toString()} / {currCard.exp_year.toString().substring(2,4)}</Text>
	    			{defaultButton}
	    			{deleteButton}
	    		</View>
	    	);
	    }.bind(this));
	    return result;
	}

	render() {
		if(this.state.user == 'null' || this.state.cards == 'null' || this.state.balance == 'null'){
			return <Expo.AppLoading />
		}else{
			var balanceDiv;
			var stripeButton;
			var payoutText;
			if(this.state.user.trainer){
				console.log(this.state.balance);
				if(this.state.balance == 0){
					var balanceFormatted = "0.00"
				}else{
					var balanceFormatted = (parseInt(this.state.balance) / 100).toFixed(2);
				}
				balanceDiv = (<Text style={styles.balanceText}>${balanceFormatted}</Text>);
				payoutText = (<Text style={{fontSize: 20, textAlign: 'center', color: COLORS.PRIMARY, marginTop: 10}}>Funds will be transfered daily</Text>);
			}
			return (
				<KeyboardAvoidingView behavior="padding" style = {styles.container}>
					<Text style={styles.backButton} onPress={this.goToMap}>
	              		<FontAwesome>{Icons.arrowLeft}</FontAwesome>
	            	</Text>
					<Text style={styles.title}>Payments</Text>
					{balanceDiv}
					<View style={styles.cardHolder}>
						{this.renderCards()}
					</View>
					<TouchableOpacity style={styles.button} onPress={() => this.setState({cardModal: true})}>
						<Text style={styles.buttonText}><FontAwesome>{Icons.creditCard}</FontAwesome> Add Card </Text>
					</TouchableOpacity>
					{payoutText}
					<Modal
						isVisible={this.state.cardModal}
						onBackdropPress={this.hideCardModal}>
						<CardModal hide={this.hideCardModalOnAdd}/>
					</Modal>
				</KeyboardAvoidingView>	
			);
		}
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	cardHolder: {
		flex: 0.4,
		marginTop: 20,
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
	title: {
		marginTop: 45,
    	fontSize: 34,
    	color: COLORS.PRIMARY,
    	fontWeight: '700',
  	},
	form: {
		width: '90%',
		height: '100%',
		paddingBottom: 50
	},
	backButton: {
		position: 'absolute',
		top: 45,
		left: 20,
		fontSize: 35, 
		color: COLORS.SECONDARY, 
	},
	buttonText: {
		fontSize: 30,
		color: '#f6f5f5',
		textAlign: 'center'
	},
	balanceText: {
		fontSize: 30,
		color: COLORS.SECONDARY,
		textAlign: 'center'
	},
	button: {
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		width: '50%',
		height: 50,
		marginTop: 10
	},
	icon: {
		fontSize: 15
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
	defaultButton: {
		backgroundColor: COLORS.GREEN,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 30,
		height: 30
	}
});
