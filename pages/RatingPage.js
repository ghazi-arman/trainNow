import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { AppLoading } from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadSession, loadUser, rateSession, renderStars, dateToString } from '../components/Functions';

export class RatingPage extends Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		const userId = firebase.auth().currentUser.uid;
		const user = await loadUser(userId);
		const session = await loadSession(this.props.session);
		const userType = (user.trainer ? 'trainer' : 'trainee');
		if(session[userType] === userId && currentSession.traineeRating){
			Actions.reset('MapPage');
			return;
		}
		this.setState({ session, user });
	}

	backtomap = () => Actions.reset('MapPage');


	rateSession = async(rating) => {
		if (this.state.submitted) {
			return;
		}
		if (!this.state.rating) {
			Alert.alert('Enter a rating!');
			return;
		}
		this.state.submitted = true;
		try {
			await rateSession(this.state.session, rating, this.state.user.trainer);
		} catch(error) {
			this.state.submitted = false;
			this.bugsnagClient.notify(error);
			Alert.alert('There was an error rating the session. Please try again later');
		} finally {
			Actions.reset('MapPage');
		}
	}

	setRating = (key) => this.setState({rating: key});

	renderStar = (number, outline) => {
		const starToRender = (outline ? Icons.star : Icons.starO)
		return(
			<TouchableOpacity key={number} onPress={() => this.setRating(number)}>
				<Text style={styles.icon}><FontAwesome>{starToRender}</FontAwesome></Text>
			</TouchableOpacity>
		);
	}

	render() {
		if (!this.state.session || !this.state.user) {
			return <AppLoading />
		}
		const userId = firebase.auth().currentUser.uid;
		const displayDate = dateToString(this.state.session.end);
		const duration = new Date(this.state.session.end) - new Date(this.state.session.start);
		const minutes = Math.floor((duration/1000)/60);
		const rate = (parseInt(minutes) * (parseInt(this.state.session.rate) / 60)).toFixed(2);
		const payout = (parseFloat(rate) - (parseFloat(rate) * .2)).toFixed(2);

		let cost = null;
		if (this.state.session.trainer === userId && !this.state.session.managed) {
			cost = <Text style={styles.bookDetails}>Total Earned: ${payout}</Text>
		} else {
			cost = <Text style={styles.bookDetails}>Total Cost: ${rate}</Text>;
		}
		const stars = renderStars(this.state.rating);
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
					<View style={styles.buttonContain}>
						<TouchableOpacity style={styles.buttonContainer} onPressIn={this.rateSession}>
							<Text style={styles.buttonText}>Rate Session</Text>
						</TouchableOpacity>
					</View>
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
  	}
});
