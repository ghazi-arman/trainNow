import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Image } from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadGroupSession, loadUser, rateGroupSession, dateToString, chargeCard } from '../components/Functions';
import Constants from '../components/Constants';
const loading = require('../images/loading.gif');

export class GroupSessionRatingPage extends Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		const userId = firebase.auth().currentUser.uid;
		const user = await loadUser(userId);
    const session = await loadGroupSession(this.props.session);
		if(user.type === Constants.clientType && session.clients[userId].rating){
			Actions.reset('MapPage');
			return;
		}
		this.setState({ session, user });
	}

	backtomap = () => Actions.reset('MapPage');


	rateSession = async() => {
		if (this.state.pressed) {
			return;
		}
		if (!this.state.rating) {
			Alert.alert('Enter a rating!');
			return;
		}
    this.setState({ pressed: true });
		try {
      if (this.state.session.trainer !== firebase.auth().currentUser.uid) {
        var duration = new Date(this.state.session.end) - new Date(this.state.session.start);
        var minutes = Math.floor((duration/1000)/60);
        const total = (minutes * (this.state.session.rate / 60) * 100).toFixed(0);
        const payout = total - (total * Constants.newClientPercentage);
        await chargeCard(this.state.user.stripeId, this.state.session.trainerStripe, total, total - payout, this.state.session);
      }
      await rateGroupSession(this.state.session.key, this.state.rating, this.state.user.type);
		} catch(error) {
			this.setState({ pressed: false });
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error rating the session. Please try again later');
		} finally {
			Actions.reset('MapPage');
		}
	}

	setRating = (key) => this.setState({rating: key});

	renderStar = (number, outline) => {
		const starToRender = outline ? "star-o" : "star";
		return(
			<TouchableOpacity key={number} onPress={() => this.setRating(number)}>
				<Text style={styles.icon}><FontAwesome name={starToRender} size={35} /></Text>
			</TouchableOpacity>
		);
	}

	renderStars = (rating) => {
		var star = [];
		let numStars = 0;
		while(rating >= 1){
			numStars++;
			star.push(this.renderStar(numStars, false));
			rating--;
		}
		while(numStars < 5){
			numStars++;
			star.push(this.renderStar(numStars, true));
		}
		return star;
	}

	render() {
		if (!this.state.session || !this.state.user || this.state.pressed) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
		}
		const userId = firebase.auth().currentUser.uid;
		const displayDate = dateToString(this.state.session.end);
		const duration = new Date(this.state.session.end) - new Date(this.state.session.start);
		const minutes = Math.floor((duration/1000)/60);
		const total = (minutes * (this.state.session.rate / 60)).toFixed(2);
		const payout = (total - total * Constants.newClientPercentage).toFixed(2);

    let cost = null;
    let stars = null;
    let button = null;
		if (this.state.session.trainer === userId) {
			if (this.state.session.trainerType === Constants.independentType) {
				cost = <Text style={styles.bookDetails}>Total Earned: ${(payout * this.state.session.clientCount).toFixed(2)}</Text>
			}
		} else {
      cost = <Text style={styles.bookDetails}>Total Cost: ${total}</Text>;
    }
    stars = this.renderStars(this.state.rating);
    button = (
      <View style={styles.buttonContain}>
        <TouchableOpacity style={styles.buttonContainer} onPressIn={this.rateSession}>
          <Text style={styles.buttonText}>Rate Session</Text>
        </TouchableOpacity>
      </View>
    );
		return (
			<View style = {styles.container}>	
				<View style={styles.formContainer}>
					<View style={styles.infoContainer}>
						<Text style={styles.header}>Rate Session!</Text>
						<Text style={styles.bookDetails}>Ended: {displayDate} </Text>
						<Text style={styles.bookDetails}>Total Time: {minutes} min</Text>
						{cost}
						<View style={styles.starContainer}>
							{stars}
						</View>
					</View>
          {button}
				</View>
			</View>	
		);
	}
}

const styles = StyleSheet.create({
	bookDetails:{
		fontSize: 25,
		fontWeight: '500',
		color: COLORS.PRIMARY
	},
	header: {
		fontSize: 35,
		fontWeight: '700',
		color: COLORS.PRIMARY
	},
	container: {
		flex: 1,
		backgroundColor: COLORS.WHITE,
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center'
	},
	formContainer: {
		width: '80%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	buttonContain: {
		width: '50%'
	},
	starContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10
	},
	infoContainer: {
		height: '65%',
		width: '100%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},	
	buttonContainer: {
		borderRadius: 5,
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		width: '100%'
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	icon: {
  	color: COLORS.SECONDARY,
		fontSize: 35,
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
  }
});
