import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TouchableWithoutFeedback, Image, Alert } from 'react-native';
import firebase from 'firebase';
import MapView from 'react-native-maps';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
import { loadGym, renderStars } from '../components/Functions';
const markerImg = require('../images/marker.png');
const profileImg = require('../images/profile.png');
const loading = require('../images/loading.gif');

export class GymModal extends Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.bugsnagClient = bugsnag();
	}

	async componentDidMount() {
		if(!this.state.gym) {
			try {
				const gym = await loadGym(this.props.gymKey);
				this.loadImages(gym);
				this.setState({ gym })
			} catch(error) {
				this.bugsnagClient.notify(error);
				Alert.alert('There was an error loading this gym. Please try again later.');
				this.props.hide();
			}
		}
	}

	// Loads trainer images from firesbase
	loadImages = (gym) => {
		if(!gym.trainers) {
			return;
		}
		Object.keys(gym.trainers).map(async(key) => {
			try {
				const url = await firebase.storage().ref().child(key).getDownloadURL();
				gym.trainers[key].uri = url;
				this.setState({ gym });
			} catch(error) {
				gym.trainers[key].uri = null;
				this.setState({ gym });
			}
		});
	}

	//Deselects or selects trainer based on trainer clicked
	setTrainer = (trainer) => {
		if (this.state.trainer == trainer) {
				return null;
		}
		return trainer;
	}

  //Returns list of trainers with corresponding view
	renderTrainers = () => {
		if (!this.state.gym.trainers) {
			return;
		}

		const trainers = [];
		Object.keys(this.state.gym.trainers).map((key) => {
			const trainer = this.state.gym.trainers[key];
			trainer.key = key;
			trainers.push(trainer);
		});

		trainers.sort(function(a,b) {
			if(a.active && b.active){
				return parseFloat(b.rating) - parseFloat(a.rating);
			}else if(b.active){
				return 1;
			}else{
				return -1;
			}
		});

		const trainersList = trainers.map((trainer) => {
			//Get active status of trainer
			let activeField;
			if (trainer.active) {
				activeField = <Text style={[styles.rate, styles.active]}>Active - ${trainer.rate}/hr</Text>;
			} else {
				activeField = <Text style={[styles.rate, styles.away]}>Away - ${trainer.rate}/hr</Text>;
			}

			let imageHolder;
			if (!trainer.uri) {
				imageHolder = (<View style={styles.imageContainer}><Image source={profileImg} style={styles.imageHolder} /></View>);
			} else {
				imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: trainer.uri }} style={styles.imageHolder} /></View>);
			}

			let infoArea;
			if (this.state.trainer === trainer.key) {
				infoArea = (
					<View style={styles.infoArea}>
						<Text style={styles.info}>{trainer.bio}</Text>
						<Text style={styles.info}>Certs: {trainer.cert}</Text>
						<View style={styles.buttonRow}>
							<TouchableOpacity style={styles.buttonContainer} onPress={() => {this.props.setTrainer(trainer)}}>
								<Text style={styles.buttonText}>Book Now!</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.buttonContainer} onPress={() => {this.props.viewSchedule(trainer)}}>
								<Text style={styles.buttonText}>Schedule</Text>
							</TouchableOpacity>
						</View>
					</View>
				);
			} else {
				infoArea = null;
			}

			//DOM Element for a trainer in gym modal
			return(
				<TouchableWithoutFeedback key={trainer.key} onPress={() => {this.setState({trainer: this.setTrainer(trainer.key)})}}>
					<View style={styles.trainerContainer}>
							<View style={styles.trainerRow}>
								{imageHolder}
								<View style={styles.trainerInfoContainer}>
										<Text style={styles.trainerName}>{trainer.name}</Text>
										<View style={styles.ratingContainer}>
											<Text style={styles.icon}>{renderStars(trainer.rating)}</Text>
											{activeField}
										</View>
								</View>
							</View>
							{infoArea}
					</View>
				</TouchableWithoutFeedback>
			);
		});
		return trainersList;
	}

	//Loads map object
	loadMap = () => {
		return (
			<MapView
				style={styles.map}
				region={{
					latitude: this.state.gym.location.latitude,
					longitude: this.state.gym.location.longitude,
					latitudeDelta: 0.0422,
					longitudeDelta: 0.0221
				}}
				pitchEnabled = {false} rotateEnabled = {false} scrollEnabled = {false} zoomEnabled = {false}>
				<MapView.Marker
					key={this.state.gym.key}
					coordinate={this.state.gym.location}
				>
					<Image source={markerImg} style={{width: 50, height: 50}} />
				</MapView.Marker>
			</MapView>
		);
	}

	render(){
		if (!this.state.gym) {
      return <Image source={loading} style={styles.loading} />;
		}
		return(
			<View style={styles.modal}>
				<View style={styles.nameContainer}>
					<Text style={styles.gymName}>{this.state.gym.name}</Text>
					<Text style={styles.hourDetails}>{this.state.gym.hours}</Text>
					<Text style={styles.closeButton} onPress={this.props.hide}>
						<FontAwesome>{Icons.close}</FontAwesome>
					</Text>
				</View>
				<View style={styles.mapContainer}>
					{this.loadMap()}
				</View>
				<View style={styles.trainersContainer}>
					<ScrollView showsVerticalScrollIndicator={false}>
						{this.renderTrainers()}
					</ScrollView>
				</View>
			</View>
		)
	}
}

const styles = StyleSheet.create({
	modal: {
		flex: .95,
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		backgroundColor: COLORS.WHITE,
		borderRadius: 10,
	},
	gymName: {
		fontSize: 30,
		color: COLORS.WHITE,
		fontWeight: '500'
	},
	nameContainer: {
		height: '15%',
		width: '100%',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		backgroundColor: COLORS.PRIMARY,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	mapContainer: {
		height: '20%',
		width: '100%'
	},
	map: {
		height: '100%',
		width: '100%'
	},
	trainersContainer: {
		height: '60%',
		width: '95%',
		flexDirection: 'row',
		justifyContent: 'center',
		paddingLeft: 22
	},
	trainerContainer: {
		backgroundColor: COLORS.WHITE,
		width: '95%',
		minHeight: 100,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
		marginTop: 10
	},
	trainerRow: {
		width: '90%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10,
	},
	ratingRow: {
		width: '90%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 10
	},
	infoArea: {
		width: '95%',
	},
	info: {
		fontSize: 16,
		fontWeight: '500',
		color: COLORS.PRIMARY,
		margin: 5
	},
	buttonRow: {
		width: '100%',
		flexDirection: 'row', 
		justifyContent: 'space-between',
		marginTop: 10
	},
  imageContainer: {
		width: 90,
		height:90,
		borderRadius: 5,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 90,
		height: 90,
		borderRadius: 5
	},
	trainerInfoContainer:{
		width: '60%',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'center',
		minHeight: 100,
	},
	ratingContainer: {
		height: 50,
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	trainerName: {
		fontSize: 22,
		fontWeight: '600',
		color: COLORS.PRIMARY
	},
	closeButton: {
		position: 'absolute',
		top: 5,
		right: 5,
		fontSize: 35,
		color: COLORS.RED,
	},
	rate: {
		fontSize: 16,
		fontWeight: '500',
		color: COLORS.WHITE
	},
	hourDetails: {
		fontSize: 20,
		color: COLORS.WHITE,
		fontWeight: '400',
		marginTop: 5,
	},
	buttonContainer: {
		width: '40%',
		height: 48,
		backgroundColor: COLORS.SECONDARY,
		flexDirection: 'column',
		justifyContent: 'center',
		margin: 10,
		borderRadius: 5
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	active:{
		color: COLORS.SECONDARY
	},
	away:{
		color: COLORS.PRIMARY
	},
	icon: {
		color: COLORS.SECONDARY,
		fontSize: 15,
	},
	loading: {
    width: '100%',
    resizeMode: 'contain'
  }
});