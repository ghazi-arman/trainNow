import React, { Component } from 'react';
import {Platform, StyleSheet, Text, View, Button, Image, KeyboardAvoidingView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {Permissions, Location, ImagePicker, Font} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';
import COLORS from './Colors';

export class AccountPage extends Component {

	constructor(props) {
		super(props);
		this.goToMap=this.goToMap.bind(this);
	}

	goToMap(){
		if(this.form.state.change == true){
			Alert.alert(
			  "Are you sure you want to abandon your changes?", 
			  "",
			  [
			    {text: 'No'},
			    {text: 'Yes', onPress: () => {
			      Actions.map();
			    }},
			  ],
			);
		}else{
			Actions.map();
		}
	}

	// load font after render the page
	async componentDidMount() {
		await Expo.Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		this.setState({ fontLoaded: true });
	}

	render() {
		return (
			<KeyboardAvoidingView behavior="padding" style = {styles.container}>
				<Text style={styles.backButton} onPress={this.goToMap}>
              		<FontAwesome>{Icons.arrowLeft}</FontAwesome>
            	</Text>
				<Text style={styles.title}>Settings</Text>
				<View style={styles.form}>		
					<ScrollView>
						<AccountForm ref={(form) => {this.form = form}}/>
					</ScrollView>
				</View>
			</KeyboardAvoidingView>	
		);
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
	}
});
