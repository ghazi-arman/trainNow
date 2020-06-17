import React, { Component } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import { BookModalRegular } from '../modals/BookModalRegular';
import COLORS from '../components/Colors';
import { loadUser, loadRecentTrainers, loadClientRequests, acceptClientRequest, sendTrainerRequest, denyClientRequest } from '../components/Functions';
const loading = require('../images/loading.gif');

export class TrainerPage extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'recent',
      bookModal: false,
      pressed: false
    }
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user || !this.state.recentTrainers || !this.state.clientRequests) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        const recentTrainers = await loadRecentTrainers(userId);
        const clientRequests = await loadClientRequests(userId);
        this.setState({ user, recentTrainers, clientRequests });
      } catch(error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the trainer page. Please try again later.');
        this.goToMap();
      }
    }
  }

  sendTrainerRequest = async (trainerKey, clientName, gymKey) => {
    if (this.state.pressed) {
      return;
    }
    try {
      this.setState({ pressed: true });
      const userId = firebase.auth().currentUser.uid;
      await sendTrainerRequest(trainerKey, clientName, userId, gymKey);
      Alert.alert(`Request was sent to the trainer.`);
      const user = await loadUser(userId);
      this.setState({ user, pressed: false });
    } catch(error) {
      this.setState({ pressed: false });
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the request.');
    }
  }

  denyRequest = async(requestKey, trainerKey) => {
    try {
      const userId = firebase.auth().currentUser.uid;
      await denyClientRequest(requestKey, userId, trainerKey);
      const clientRequests = await loadClientRequests(userId);
      this.setState({ clientRequests });
    } catch(error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error denying the request.');
    }
  }

  acceptRequest = async(requestKey, trainerKey, trainerName, gymKey) => {
    try {
      await acceptClientRequest(requestKey, trainerKey, trainerName, firebase.auth().currentUser.uid, this.state.user.name, gymKey);
      const clientRequests = await loadClientRequests(firebase.auth().currentUser.uid);
      const user = await loadUser(firebase.auth().currentUser.uid);
      this.setState({ clientRequests, user });
    } catch(error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error accepting the request.');
    }
  }

  bookSession = (trainer, trainerGym) => {
    this.setState({bookingTrainer: trainer, selectedGym: trainerGym, bookModal: true});
  }

  hidebookModal = () => {
    this.setState({bookModal: false});
  }

  renderRequests = () => {
    return this.state.clientRequests.map((request) => {
      return(
        <View key={request.trainer} style={styles.clientRow}>
          <Text style={styles.nameText}>{request.trainerName}</Text>
          <TouchableOpacity style={styles.denyButton} onPress={() => this.denyRequest(request.key, request.trainer)}> 
            <Text style={styles.buttonText}><FontAwesome name="close" size={18} /> Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={() => this.acceptRequest(request.key, request.trainer, request.trainerName, request.gym)}> 
            <Text style={styles.buttonText}><FontAwesome name="check" size={18} /> Accept</Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  renderTrainers = () => {
    if(!this.state.user.trainers){
      return;
    }
    return Object.keys(this.state.user.trainers).map((key) => {
      const trainer = this.state.user.trainers[key];
      return(
        <View key={trainer.trainer} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.trainerName}</Text>
          <TouchableOpacity style={styles.requestButton} onPress={() => this.bookSession(trainer.trainer, trainer.gym)}> 
            <Text style={styles.buttonText}><FontAwesome name="calendar" size={18} /> Book </Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  renderRecent = () => {
    return this.state.recentTrainers.map((trainer) => {
      if(this.state.clientRequests.filter(request => (request.trainer == trainer.key)).length > 0 ||
        (this.state.user.trainers && this.state.user.trainers[trainer.key])){
        return;
      }

      let button;
      if(this.state.user.requests && this.state.user.requests[trainer.key]){
        button = (
          <TouchableOpacity style={styles.requestButton} disabled={true}> 
            <Text style={styles.buttonText}><FontAwesome name="hourglass" size={18} /> Pending</Text>
          </TouchableOpacity>
        );
      }else{
        button = (
          <TouchableOpacity style={styles.requestButton} onPress={() => this.sendTrainerRequest(trainer.key, this.state.user.name, trainer.gym)}> 
            <Text style={styles.buttonText}><FontAwesome name="user-plus" size={18} /> Add </Text>
          </TouchableOpacity>
        );
      }
      return(
        <View key={trainer.key} style={styles.clientRow}>
          <Text style={styles.nameText}>{trainer.name}</Text>
          {button}
        </View>
      );
    });
  }

  goToMap = () => {
    Actions.MapPage();
  }

  render() {
    if (!this.state.user || !this.state.clientRequests || !this.state.recentTrainers || this.state.pressed) {
      return <View style={styles.loadingContainer}><Image source={loading} style={styles.loading} /></View>;
    }
    if(this.state.currentTab == 'requests'){
      var navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'requests'})}>
            <Text style={styles.activeText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'trainers'})}>
            <Text style={styles.navText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      var content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderRequests()}
        </ScrollView>
      );
    }else if(this.state.currentTab == 'recent'){
      var navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'requests'})}>
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'recent'})}>
            <Text style={styles.activeText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'trainers'})}>
            <Text style={styles.navText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      var content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderRecent()}
        </ScrollView>
      );
    }else{
      var navBar = (
        <View style={styles.navigationBar}>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'requests'})}>
            <Text style={styles.navText}>Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inactiveTab} onPress={() => this.setState({currentTab: 'recent'})}>
            <Text style={styles.navText}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activeTab} onPress={() => this.setState({currentTab: 'trainers'})}>
            <Text style={styles.activeText}>Trainers</Text>
          </TouchableOpacity>
        </View>
      );
      var content = (
        <ScrollView showsVerticalScrollIndicator={false}>
          {this.renderTrainers()}
        </ScrollView>
      );
    }
    return (
      <View style = {styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.goToMap}>
            <FontAwesome name="arrow-left" size={35} />
          </Text>
          <Text style={styles.title}>Trainers</Text>
        </View>
        {navBar}
        {content}
        <Modal 
          isVisible={this.state.bookModal}
          onBackdropPress={this.hidebookModal}>
            <BookModalRegular trainer={this.state.bookingTrainer} gym={this.state.selectedGym} hide={this.hidebookModal} confirm={() => Alert.alert('Session Booked!')}/>
        </Modal>
      </View>	
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
    fontSize: 34,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  navigationBar: {
    width: '100%',
    height: 100,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 5,
  },
  nameContainer: {
    height: '10%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end'
  },
  activeTab: {
    width: '33%',
    paddingVertical: 20,
    backgroundColor: COLORS.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY
  },
  inactiveTab: {
    width: '33%',
    paddingVertical: 20,
    backgroundColor: COLORS.WHITE,
    borderWidth: 1, 
    borderColor: COLORS.SECONDARY
  },
  navText: {
    fontSize: 23,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textAlign: 'center'
  },
  activeText: {
    fontSize: 23,
    fontWeight: '600',
    color: COLORS.WHITE,
    textAlign: 'center'
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '90%',
    marginTop: 10
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35, 
    color: COLORS.SECONDARY,
    paddingBottom: 5
  },
  buttonText: {
    fontSize: 18,
    color: COLORS.WHITE,
    textAlign: 'center'
  },
  requestButton: {
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 120,
    height: 40,
  },
  acceptButton: {
    borderRadius: 5,
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 40,
  },
  denyButton: {
    borderRadius: 5,
    backgroundColor: COLORS.RED,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 40,
  },
  icon: {
    fontSize: 15
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
  },
  nameText: {
    fontSize: 18,
    fontWeight: '500',
    width: '50%',
    textAlign: 'center',
    color: COLORS.PRIMARY
  }
});