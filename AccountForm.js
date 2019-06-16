import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, ScrollView, Alert, Switch, Image} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { ImagePicker, Font, Permissions} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import COLORS from './Colors';
import TextField from './components/TextField';

export class AccountForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			fontLoaded: false,
			image: null,
			imageToUpload: null,
			change: false
		};
		this.updateAccount=this.updateAccount.bind(this);
	}

	componentDidMount() {
		//Load Font
		if(!this.state.fontLoaded){
			this.loadFont();
		}
	    //pull user from database and check if trainer
	    let usersRef = firebase.database().ref('users');
	   	var user = firebase.auth().currentUser;
	   	firebase.storage().ref().child(user.uid).getDownloadURL().then(function(url){
	   		this.setState({image: url});
	   	}.bind(this), function(error){
	   		console.log(error);
	   	});
	   	if(user){
	   		usersRef.orderByKey().equalTo(user.uid).once("child_added", function(snapshot) {
	   			var currentUser = snapshot.val();
	    		var trainerState = currentUser.trainer;
	  			this.setState({ trainer: trainerState,
	  						   	user: currentUser,
	  						   	name: currentUser.name,
	  						   	rate: currentUser.rate,
	  						   	cert: currentUser.cert,
	  						   	bio: currentUser.bio,
	  						   	gym: currentUser.gym,
	  						   	active: currentUser.active });
			}.bind(this));
	   	}
  	}

  	loadFont = async () => {
		await Expo.Font.loadAsync({
	      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
	      fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf')
	    });
	    this.setState({fontLoaded: true});
	}

  	pickImage = async () => {
    	const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
		
		if (status === 'granted') {
	      	let result = await ImagePicker.launchImageLibraryAsync({
	        	allowsEditing: true,
	    	    aspect: [4, 3],
		      });

	    	if (!result.cancelled) {
	        	this.setState({ imageToUpload: result.uri, image: result.uri, change: true});
	      	}
	    } else {
	      throw new Error('Camera roll permission not granted');
	    }
    }

    async uploadImageAsync(uri, uid) {
	  	const response = await fetch(uri);
	  	const blob = await response.blob();
	  	const ref = firebase.storage().ref().child(uid);

		const snapshot = await ref.put(blob);
		return snapshot.downloadURL;
	}

	updateAccount() {
		// input validation
		if(!this.state.name.length) {
			Alert.alert("Please enter a name!");	
			return;			
		}		
		
		// update info in users table
		var userRef = firebase.database().ref('users');
		var user = firebase.auth().currentUser;
		userRef.child(user.uid).update({
			name: name,
		});

		// image upload
		if(uri != null){
			this.uploadImageAsync(uri, user.uid);
		}

		this.setState({change: false})
		Alert.alert("Updated");
	}

	render() {
		if(this.state.image != null){
			imageHolder = (<View style={styles.imageContainer}><Image source={{ uri: this.state.image }} style={styles.imageHolder} /></View>);
		}else{
			imageHolder = (<View style={styles.imageContainer}><View style={styles.imageHolder}></View></View>);
		}
		return (
			<View style = {styles.container}>
				<StatusBar barStyle="light-content" />
				<TextField
					rowStyle={styles.inputRow}
					iconStyle={styles.icon}
					icon={Icons.user}
					style={styles.input}
					placeholder="Name"
					color={COLORS.PRIMARY}
					onChange={this.handleName}
					value={this.state.name} 
				/>
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.pickImage}>
					<Text style={styles.buttonText}>
						Update Image
					</Text>
				</TouchableOpacity>	
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.updateAccount}>
					<Text style={styles.buttonText}>
						Save Changes
					</Text>
				</TouchableOpacity>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		padding: 20,
	},
	input: {
		height: 40,
		borderWidth: 0,
		backgroundColor: 'transparent',
		borderBottomWidth: 1,
		borderColor: COLORS.PRIMARY,
		width: '90%',
		color: COLORS.PRIMARY
	},
	inputRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end',
		marginBottom: 20
	},
	icon: {
		color: COLORS.PRIMARY,
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	buttonContainer: {
		backgroundColor: COLORS.SECONDARY,
		paddingVertical: 15,
		marginTop: 10
	},
	buttonText: {
		textAlign: 'center',
		color: COLORS.WHITE,
		fontWeight: '700'
	},
	imageContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
	},
	imageHolder: {
		width: 220,
		height: 220,
		borderWidth: 1,
		borderColor: COLORS.PRIMARY,
	},
});