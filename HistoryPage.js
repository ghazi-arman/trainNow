import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import {Permissions, Location, Font, ImagePicker, AppLoading} from 'expo';
import firebase from 'firebase';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import Modal from 'react-native-modal';
import {AccountForm} from './AccountForm';
import { Actions } from 'react-native-router-flux';
import { HistoryBar } from './HistoryBar';
import { SessionModal } from './SessionModal';

export class HistoryPage extends Component {

	constructor(props) {
		super(props);
		
		this.state = {
      		pendingModal: false,
      		sessions: 'null',
      		loaded: false
      	}
	}

	backtomap() {
		Actions.map();
	}

	gotoUser(){
		Actions.account();
	}

	hidependingModal = () => this.setState({pendingModal: false});

	// load font after render the page
	componentDidMount() {
		Expo.Font.loadAsync({
		  fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
		});
		var user = firebase.auth().currentUser;
		this.loadSessions(user.uid);
	}

	loadSessions(userKey){
		var sessions = [];
    	var gymsRef = firebase.database().ref('pastSessions/' + userKey);
    	gymsRef.on('value', function(data) {
    		data.forEach(function(dbevent) {
        		var item = dbevent.val();
        		item.session.key = dbevent.key;
        		console.log(item.session);
        		sessions.push(item.session);
      		}.bind(this));
      		this.setState({sessions: sessions, loaded: true});
    	}.bind(this));
    }

	renderSessions(){
		var sessions = this.state.sessions;
		console.log(sessions);
		var sessionsList = sessions.map(function(session){
			console.log(session);
	       	var displayDate = this.dateToString(session.end);
			var duration = new Date(session.end) - new Date(session.start);
			var minutes = Math.floor((duration/1000)/60);
			var rate = (parseInt(minutes) * (parseInt(session.rate) / 60)).toFixed(2);
			return(
		        <View style={styles.trainerContainer} key={key}>
		          <View style={styles.trainerRow} key={trainer.key}>
		            <View style={styles.trainerInfoContainer}>
		              <View style={styles.trainerView}><Text style={styles.trainerInfo}>{session.date}</Text></View>
		              <View style={styles.rateView}><Text style={styles.rateInfo}>${rate}</Text></View>
		            </View> 
		          </View>
		        </View>
	        );
	    });
	    return sessionsList;
	}

	render() {
		if(this.state.loaded == false){
			return <Expo.AppLoading />;
		}
		return (
			<KeyboardAvoidingView 
				behavior="padding"
				style = {styles.container}
				>		
				<ScrollView contentContainerStyle = {styles.historyContainer}>
					{this.renderSessions()}
				</ScrollView>
				<Modal 
					isVisible={this.state.pendingModal}
        			onBackdropPress={this.hidependingModal}>
          			<SessionModal />
        		</Modal>
				<HistoryBar map={this.backtomap} account={this.gotoUser} pending={() => this.setState({ pendingModal: true })} history={() => Actions.history()}/>
			</KeyboardAvoidingView>	
		);
	}
}


const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#252a34',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'	
	},
	historyContainer: {
		width: '90%',
		height: '80%',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center'
	},
	trainerContainer: {
  		width: '90%',
  		flexDirection: 'column',
  		justifyContent: 'center',
  		alignItems: 'center'
  	},
  	trainerInfoContainer:{
    	width: '70%',
    	flexDirection: 'row',
    	justifyContent: 'space-around',
    	height: 50
  	},
  	trainerInfo: {
  		paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '600',
    	color: '#FAFAFA'
  	},
  	rateInfo: {
  		paddingVertical: 15,
    	textAlign: 'center', 
    	fontSize: 15,
    	fontWeight: '600',
    	color: '#08d9d6'
  	},
  	trainerRow: {
	    flexDirection: 'row',
	    justifyContent: 'space-between',
	    height: 50,
	    borderWidth: 1,
	   	borderColor: '#08d9d6',
	   	marginTop: 10
  	},
  	trainerView: {
    	width: '50%',
    	height: 50
  	},
});
