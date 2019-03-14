import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {Permissions, Location, ImagePicker, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import {CardModal} from './CardModal';

export class PaymentPage extends Component {

	constructor(props) {
		super(props);
		this.state = {
			cardModal: false,
			user: 'null',
			cards: 'null'
		}
		this.renderCards=this.renderCards.bind(this);
		this.getCardIcon=this.getCardIcon.bind(this);
		this.deleteCard=this.deleteCard.bind(this);
	}

	async componentDidMount() {
		await Expo.Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		//Get user info for state
	    var user = firebase.auth().currentUser;
	    var usersRef = await firebase.database().ref('users');
	    usersRef.orderByKey().equalTo(user.uid).on('child_added', async function(snapshot) {
	    	var user = snapshot.val();
	    	var cards = await this.loadCards(user.stripeId);
	    	this.setState({user: user, cards: cards});
	    }.bind(this));
	}

	goToMap(){
		Actions.map();
	}

	hideCardModal(){
		this.setState({cardModal: false});
	}

	hideCardModalOnAdd(){
		Actions.reset('payment');
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
			return 0;
		}else{
			try {
		      	const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/listCards/', {
			        method: 'POST',
			        body: JSON.stringify({
			          id: stripeId,
			        }),
			    });
			    const data = await res.json();
			    data.body = JSON.parse(data.body);
			    return data.body.cards.data;
			}catch(error){
				console.log(error);
			}
		}
	}

	async deleteCard(stripeId, cardId, index){
		Alert.alert(
	      'Are you sure you want to delete this card?', 
	      '',
	      [
	        {text: 'No'},
	        {text: 'Yes', onPress: async () => {
				try {
				    const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/deleteCard/', {
				        method: 'POST',
				        body: JSON.stringify({
				          stripeId: stripeId,
				          cardId: cardId
				        }),
				    });
				    const data = await res.json();
				    data.body = JSON.parse(data.body);
				    console.log(data.body);
				    this.state.cards.splice(index, 1);
				    this.forceUpdate();
				    return;
				}catch(error){
					console.log(error);
				}
			}}
		]);
	}

	async createStripeTrainer(){
		try {
			var user = firebase.auth().currentUser;
			const res = await fetch('https://us-central1-trainnow-53f19.cloudfunctions.net/stripe/createTrainer/', {
				method: 'POST',
				body: JSON.stringify({
					email: this.state.user.email,
					id: user.uid,
				}),
			});
			const data = await res.json();
		    data.body = JSON.parse(data.body);
		    var userRef = firebase.database().ref('users');
		    userRef.child(user.uid).update({
		        stripeId: data.body.trainer.id
		    });
		    console.log(data);
		}catch(error) {
			console.log(error);
		}
	}

	renderCards(){
		if(this.state.cards == 0 || this.state.cards === undefined){
			return (<Text>No Cards Added</Text>);
		}
		let index = 0;
		var result = this.state.cards.map(function(currCard){
    		return(
    			<View style={styles.cardRow} key={currCard.id}>
	    			<Text style={styles.icon}>{this.getCardIcon(currCard.brand)}</Text>
	    			<Text>{currCard.exp_month.toString()} / {currCard.exp_year.toString()}</Text>
	    			<Text>{currCard.last4}</Text>
	    			<TouchableOpacity style={styles.deleteButton} onPress={() => this.deleteCard(this.state.user.stripeId, currCard.id, index)}>
	    				<Text>X</Text>
	    			</TouchableOpacity>
	    		</View>
	    	);
	    	index++;
	    }.bind(this));
	    return result;
	}

	render() {
		if(this.state.user == 'null' || typeof this.state.user == undefined || this.state.cards == 'null' || typeof this.state.cards == undefined){
			return <Expo.AppLoading />
		}else{
			if(this.state.user.stripeId === undefined && this.state.user.trainer){
				this.createStripeTrainer();
			}
			return (
				<KeyboardAvoidingView behavior="padding" style = {styles.container}>
					<Text style={styles.backButton} onPress={this.goToMap}>
	              		<FontAwesome>{Icons.arrowLeft}</FontAwesome>
	            	</Text>
					<Text style={styles.title}>Payment Settings</Text>
					<View style={styles.cardHolder}>
						{this.renderCards()}
					</View>
					<TouchableOpacity style={styles.button} onPress={() => this.setState({cardModal: true})}>
						<Text style={styles.buttonText}>
							<FontAwesome>{Icons.creditCard}</FontAwesome> Add Card
						</Text>
					</TouchableOpacity>
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
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	cardHolder: {
		flex: 0.4,
		backgroundColor: '#fafafa',
		width: '90%',
		borderRadius: 10,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	cardRow: {
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	title: {
		marginTop: 80,
		paddingVertical: 5,
    	fontSize: 34,
    	color: '#08d9d6',
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
		color: '#08d9d6', 
	},
	buttonText: {
		fontSize: 30,
		color: '#fafafa',
		textAlign: 'center'
	},
	button: {
		backgroundColor: '#08d9d6',
		flexDirection: 'column',
		justifyContent: 'center',
		width: '50%',
		height: 50,
		marginTop: 10
	},
	deleteButton: {
		backgroundColor: 'red',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		width: 40,
		height: 40
	}
});
