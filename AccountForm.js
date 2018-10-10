import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, ScrollView, Alert, Switch} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { ImagePicker, Font} from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';

export class AccountForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
			fontLoaded: false,
			trainer: false,
			active: false,
			name:'',
			rate:'',
			bio:'',
			cert:'',
			gym: '',
			user: {}
		};
		this.onUpdatePress=this.onUpdatePress.bind(this);
	}

	componentDidMount() {
		//Load Font
		if(!this.state.fontLoaded){
			this.loadFont();
		}
	    //pull user from database and check if trainer
	    let usersRef = firebase.database().ref('users');
	   	var user = firebase.auth().currentUser;
	   	if(user){
	   		usersRef.orderByKey().equalTo(user.uid).on("child_added", function(snapshot) {
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

  	_pickImage = async () => {
    	let result = await ImagePicker.launchImageLibraryAsync({
     		allowsEditing: true,
      		aspect: [4, 3],
    	});

    	if (!result.cancelled) {
      		this.setState({ image: result.uri });
    	}
    }

	onUpdatePress() {
		// client side authentication
		var gym = this.state.gym;
		var name = this.state.name;
		var rate = this.state.rate;
		var cert = this.state.cert;
		var bio = this.state.bio;
		var trainer = this.state.trainer;
		var active = this.state.active

		//name missing
		if(!name.length) {
			Alert.alert("Please enter a name!");	
			return;			
		}		

		if(trainer){
			if(!rate.length){
				Alert.alert("Please enter a rate!");
				return;
			}
			if(!cert.length){
				Alert.alert("Please enter your certifications!");
				return;
			}
			if(!bio.length){
				Alert.alert("Please enter your bio!");
				return;
			}
		}
				
		var userRef = firebase.database().ref('users');
		var user = firebase.auth().currentUser;

		if(trainer){
		    var trainerRef = firebase.database().ref('/gyms/' + gym + '/trainers/' + user.uid);
		    trainerRef.update({
		    	name: name,
		    	cert: cert,
		    	rate: rate,
		    	bio: bio,
		    	active: active
		    })

			userRef.child(user.uid).set({
				name: name,
				cert: cert,
				rate: rate,
				bio: bio,
				gym: gym,
				trainer: true,
				active: active
			});

		}else{
			userRef.child(user.uid).set({
				name: name,
				trainer: false
			});
		}
		Alert.alert("Updated");
	}

	render() {
		let isTrainer = this.state.trainer;
		nameField =(
			<View style={styles.inputRow}>
				<Text style={styles.icon}>
					<FontAwesome>{Icons.user}</FontAwesome>
				</Text>
				<TextInput
				placeholder="Name"
				returnKeyType="done"
				style={styles.input}
				selectionColor="#FFF"
				placeholderTextColor='#08d9d6'
				onChangeText={(name) => this.setState({name})}
				value={this.state.name}
				autoCorrect={false}
				/>
			</View>);
		if(isTrainer){
			activeField = (
				<View style={styles.switchRow}>
					<Text style={styles.hints}>Active? </Text>			
					<Switch
						onTintColor="#ff2e63"
						tintColor="#ff2e63"
						thumbTintColor="#08d9d6"
						style={{marginLeft: 10}}
						value={this.state.active}
						onValueChange={(active) => this.setState({active})}
						/>
				</View>);
			rateField = (
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.dollar}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Rate"
						style={styles.input}
						selectionColor="#FFF"
						placeholderTeaxtColor='#08d9d6'
						onChangeText={(rate) => this.setState({rate})}
						value={this.state.rate.toString()}
						keyboardType="number-pad"
						returnKeyType="done"
					/>
				</View>);
			certField = (
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.vcard}</FontAwesome>
					</Text>
					<TextInput
						placeholder="Certifications"
						returnKeyType="done"
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#08d9d6'
						onChangeText={(cert) => this.setState({cert})}
						value={this.state.cert}
						autoCorrect={false}
						/>
				</View>);
			bioField = (
				<View style={styles.inputRow}>
					<Text style={styles.icon}>
						<FontAwesome>{Icons.info}</FontAwesome>
					</Text>
					<TextInput
						autoCorrect={false}
						blurOnSumbit={true}
						placeholder="Bio"
						returnKeyType="done"
						multiline={true}
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#08d9d6'
						onChangeText = {(bio) => this.setState({bio})}
						value={this.state.bio}
						/>
				</View>);
		}else{
			rateField = null;
			bioField = null;
			certField = null;
			activeField = null;
		}
		return (
			<View style = {styles.container}>
			<StatusBar 
				barStyle="light-content"
				/>
				{activeField}
				{nameField}
				{rateField} 
				{bioField}
				{certField}
				<TouchableOpacity style={styles.buttonContainer} onPressIn={() => this._pickImage()}>
					<Text 
						style={styles.buttonText}
						>
						Update Image
					</Text>
				</TouchableOpacity>	
				<TouchableOpacity style={styles.buttonContainer} onPressIn={this.onUpdatePress}>
					<Text 
						style={styles.buttonText}
						>
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
		borderColor: '#ff2e63',
		width: '90%',
		color: '#08d9d6'
	},
	inputRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end',
		marginBottom: 20
	},
	switchRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 5
	},
	icon: {
		color: '#ff2e63',
		fontSize: 30,
		marginRight: 10,
		marginTop: 13
	},
	buttonContainer: {
		backgroundColor: '#ff2e63',
		paddingVertical: 15,
		marginTop: 10
	},
	buttonText: {
		textAlign: 'center',
		color: '#FAFAFA',
		fontWeight: '700'
	},
	hints:{
		color: "#08d9d6",
		fontSize: 25,		
		fontWeight: "500"
	}
});