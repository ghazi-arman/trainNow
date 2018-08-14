import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import { ImagePicker} from 'expo';



export class AccountForm extends Component {
	
	constructor(props) {
		super(props);
		this.state = {
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

	componentWillMount() {
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
			<View>
				<Text style = {styles.hints}> Name </Text> 
				<TextInput
				placeholder="Name"
				returnKeyType="done"
				style={styles.input}
				selectionColor="#FFF"
				placeholderTextColor='#FFF'
				onChangeText={(name) => this.setState({name})}
				value={this.state.name}
				autoCorrect={false}
				/>
			</View>);
		if(isTrainer){
			activeField = (
				<View>
					<Text style = {styles.hints}> Are you training now? </Text>  				
					<Switch
						style={styles.switch}
						value={this.state.active}
						onValueChange={(active) => this.setState({active})}
						/>
				</View>);
			rateField = (
				<View>
					<Text style = {styles.hints}> Rate </Text> 
					<TextInput
						placeholder="Rate"
						style={styles.input}
						selectionColor="#FFF"
						placeholderTeaxtColor='#FFF'
						onChangeText={(rate) => this.setState({rate})}
						value={this.state.rate.toString()}
						keyboardType="number-pad"
						returnKeyType="done"
					/>
				</View>);
			certField = (
				<View>
					<Text style = {styles.hints}> Certifications </Text> 
					<TextInput
						placeholder="Certifications"
						returnKeyType="done"
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#FFF'
						onChangeText={(cert) => this.setState({cert})}
						value={this.state.cert}
						autoCorrect={false}
						/>
				</View>);
			bioField = (
				<View>
					<Text style = {styles.hints}> Bio </Text> 
					<TextInput
						autoCorrect={false}
						blurOnSumbit={true}
						placeholder="Bio"
						multiline={true}
						style={styles.input}
						selectionColor="#FFF"
						placeholderTextColor='#FFF'
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
	switch: {
		marginBottom: 10,
	},
	input: {
		height: 40,
		backgroundColor: 'rgba(255,255,255,0.2)',
		marginBottom: 10,
		color: '#FFF',
		paddingHorizontal: 10,
	},
	buttonContainer: {
		backgroundColor: '#C51162',
		paddingVertical: 15,
		marginTop: 10
	},
	buttonText: {
		textAlign: 'center',
		color: '#FFFFFF',
		fontWeight: '700'
	},
	hints:{
		color: "#FFF",
		fontSize: 20,		
		marginBottom: 5,
		fontWeight: "500"
	}
});