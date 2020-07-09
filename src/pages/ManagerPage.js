import React, { Component } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView,
} from 'react-native';
import firebase from 'firebase';
import Modal from 'react-native-modal';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import PropTypes from 'prop-types';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import TextField from '../components/TextField';
import {
  loadUser,
  loadGym,
  loadTrainerCards,
  loadBalance,
  deleteTrainerCard,
  getCardIcon,
  setDefaultTrainerCard,
} from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class ManagerPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rateModal: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    try {
      const gym = await loadGym(this.props.gymKey);
      const user = await loadUser(firebase.auth().currentUser.uid);
      const cards = await loadTrainerCards(user.stripeId);
      const balance = await loadBalance(user.stripeId);
      this.setState({
        cards, balance, user, gym,
      });
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error loading the dashboard. Try again later');
      this.logout();
    }
  }

  async setDefaultTrainerCard(stripeId, cardId) {
    Alert.alert(
      'Are you sure you want to make this your default card?',
      '',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await setDefaultTrainerCard(stripeId, cardId);
              const cards = await loadTrainerCards(stripeId);
              this.setState({ cards });
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error. Please try again.');
            }
          },
        },
      ],
    );
  }

  deleteTrainerCard = async (stripeId, cardId, defaultCard) => {
    if (defaultCard) {
      Alert.alert('You cannot delete your default card. Email use to remove your account.');
      return;
    }
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await deleteTrainerCard(stripeId, cardId);
              const cards = await loadTrainerCards(stripeId);
              this.setState({ cards });
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error. Please try again later.');
            }
          },
        },
      ],
    );
  }

  denyTrainer = async (trainerKey) => {
    try {
      await firebase.database().ref(`/gyms/${this.props.gymKey}/pendingtrainers/`).child(trainerKey).remove();
      delete this.state.gym.pendingtrainers[trainerKey];
      Alert.alert('Trainer denied');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error when trying to deny that trainer.');
    }
  }

  deleteTrainer = async (trainerKey) => {
    Alert.alert(
      'Remove Trainer',
      'Are you sure you want to remove this trainer?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await firebase.database().ref('users').child(trainerKey).update({ deleted: true });
              await firebase.database().ref(`/gyms/${this.props.gymKey}/trainers/`).child(trainerKey).remove();
              delete this.state.gym.trainers[trainerKey];
              Alert.alert('Trainer removed from gym.');
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error when trying to delete that trainer.');
            }
          },
        },
      ],
    );
  }

  acceptTrainer = async (trainerKey) => {
    try {
      await firebase.database().ref('users').child(trainerKey).update({ pending: false, stripeId: this.state.user.stripeId });
      await firebase.database().ref(`/gyms/${this.props.gymKey}/pendingtrainers/`).child(trainerKey).once('value', (snapshot) => {
        firebase.database().ref(`/gyms/${this.props.gymKey}/trainers/`).child(trainerKey).set(snapshot.val());
      });
      await firebase.database().ref(`/gyms/${this.props.gymKey}/pendingtrainers/`).child(trainerKey).remove();
      delete this.state.gym.pendingtrainers[trainerKey];
      const gym = await loadGym(this.props.gymKey);
      this.setState({ gym });
      Alert.alert('Trainer added to gym. Please set the trainer rate immediately as it defaults to 50.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error when accepting that trainer.');
    }
  }

  renderPending = () => {
    if (!this.state.gym.pendingtrainers) {
      return (<Text style={styles.navText}>None</Text>);
    }
    return Object.keys(this.state.gym.pendingtrainers).map((key) => {
      const trainer = this.state.gym.pendingtrainers[key];
      trainer.userKey = key;
      return (
        <View key={trainer.name} style={styles.trainerRow}>
          <Text style={styles.nameText}>{trainer.name}</Text>
          <TouchableOpacity style={styles.denyButton} onPress={() => this.denyTrainer(key)}>
            <Text style={styles.buttonText}><FontAwesome name="close" size={18} /></Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={() => this.acceptTrainer(key)}>
            <Text style={styles.buttonText}><FontAwesome name="check" size={18} /></Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  renderTrainers = () => {
    if (!this.state.gym.trainers) {
      return (<Text style={styles.navText}>None</Text>);
    }
    return Object.keys(this.state.gym.trainers).map((key) => {
      const trainer = this.state.gym.trainers[key];
      trainer.userKey = key;
      return (
        <View key={trainer.name} style={styles.trainerRow}>
          <Text style={styles.nameText}>
            {trainer.name}
            {' '}
            - $
            {trainer.rate}
          </Text>
          <TouchableOpacity
            style={styles.denyButton}
            onPress={() => this.deleteTrainer(key)}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="close" size={18} />
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => this.setState({ selectedTrainer: trainer, rateModal: true })}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="dollar" size={18} />
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => Actions.ManagerHistoryPage({ userKey: key })}
          >
            <Text style={styles.buttonText}>
              <FontAwesome name="calendar" size={18} />
            </Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  logout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you wish to log out?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: () => {
            firebase.auth().signOut().then(() => {
              Actions.reset('LoginPage');
            }, (error) => {
              this.bugsnagClient.notify(error);
              Actions.reset('LoginPage');
            });
          },
        },
      ],
    );
  }

  hideRateModal = () => this.setState({ rateModal: false, selectedTrainer: null });

  renderCards = () => {
    if (!this.state.cards || !this.state.cards.length) {
      return (
        <Text style={{ marginTop: 10, fontSize: 20, color: Colors.Primary }}>
          No Cards Added
        </Text>
      );
    }
    return this.state.cards.map((currCard) => {
      let defaultButton;
      let defaultCard = false;
      if (currCard.default_for_currency) {
        defaultButton = (
          <Text style={styles.greenIcon}>
            <FontAwesome name="check-circle" size={20} />
          </Text>
        );
        defaultCard = true;
      } else {
        defaultButton = (
          <TouchableOpacity
            style={styles.defaultButton}
            onPress={() => this.setDefaultTrainerCard(this.state.user.stripeId, currCard.id)}
          >
            <Text style={{ color: Colors.White }}>
              <FontAwesome name="check" size={15} />
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.cardRow} key={currCard.id}>
          <Text style={styles.icon}>{getCardIcon(currCard.brand)}</Text>
          <Text>
            ••••••
            {currCard.last4}
          </Text>
          {defaultButton}
          <Text>
            {currCard.exp_month.toString()}
            {' '}
            /
            {' '}
            {currCard.exp_year.toString().substring(2, 4)}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => this.deleteTrainerCard(
              this.state.user.stripeId,
              currCard.id,
              defaultCard,
            )}
          >
            <Text style={{ color: Colors.White }}>
              <FontAwesome name="remove" size={15} />
            </Text>
          </TouchableOpacity>
        </View>
      );
    });
  }

  updateRate = async () => {
    try {
      if (!this.state.rate || parseInt(this.state.rate, 10) < 25) {
        Alert.alert('Please enter your rate (has to be $25+)!');
        return;
      }
      await firebase.database().ref(`/users/${this.state.selectedTrainer.userKey}/`).update({ rate: parseInt(this.state.rate, 10) });
      await firebase.database().ref(`/gyms/${this.props.gymKey}/trainers/${this.state.selectedTrainer.userKey}`).update({ rate: parseInt(this.state.rate, 10) });
      const gym = await loadGym(this.props.gymKey);
      this.setState({ gym });
      Alert.alert('Rate updated.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error updating the trainer\'s rate.');
    }
  }

  render() {
    if (
      !this.state.user
      || !this.state.gym
      || !this.state.cards
      || this.state.balance === undefined
    ) {
      return <LoadingWheel />;
    }
    const balanceFormatted = this.state.balance === 0 ? '0.00' : (this.state.balance / 100).toFixed(2);
    const trainerName = this.state.selectedTrainer ? this.state.selectedTrainer.name : 'None';
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={MasterStyles.flexStartContainer}
      >
        <Text style={styles.logoutButton} onPress={this.logout}>
          <FontAwesome name="power-off" size={35} />
        </Text>
        <Text style={styles.title}>Pending</Text>
        {this.renderPending()}
        <Text style={styles.title}>Trainers</Text>
        {this.renderTrainers()}
        <Text style={styles.balanceText}>
          $
          {balanceFormatted}
        </Text>
        {this.renderCards()}
        <TouchableOpacity style={styles.button} onPress={Actions.CardPage}>
          <Text style={styles.activeText}>
            <FontAwesome name="credit-card" size={25} />
            {' '}
            Add Card
            {' '}
          </Text>
        </TouchableOpacity>
        <Text style={{
          fontSize: 20, textAlign: 'center', color: Colors.Primary, marginTop: 10,
        }}
        >
          Funds will be transfered daily
        </Text>
        <Modal
          isVisible={this.state.rateModal}
          onBackdropPress={this.hideRateModal}
        >
          <KeyboardAvoidingView behavior="padding" style={styles.cardModal}>
            <Text style={styles.closeButton} onPress={this.hideRateModal}>
              <FontAwesome name="close" size={35} />
            </Text>
            <Text style={styles.header}>{trainerName}</Text>
            <TextField
              icon="dollar"
              placeholder="Rate"
              keyboard="number-pad"
              onChange={(rate) => this.setState({ rate })}
              value={this.state.rate}
            />
            <TouchableOpacity style={styles.submitButton} onPress={() => this.updateRate()}>
              <Text style={styles.buttonText}>Update Rate</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    );
  }
}

ManagerPage.propTypes = {
  gymKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  title: {
    marginTop: 30,
    fontSize: 34,
    color: Colors.Primary,
    fontWeight: '700',
  },
  cardRow: {
    width: '95%',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navText: {
    fontSize: 25,
    color: Colors.Primary,
    textAlign: 'center',
  },
  balanceText: {
    fontSize: 30,
    marginTop: 30,
    color: Colors.Primary,
    textAlign: 'center',
  },
  activeText: {
    fontSize: 25,
    color: Colors.White,
    textAlign: 'center',
  },
  trainerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '95%',
    marginTop: 10,
  },
  button: {
    backgroundColor: Colors.Secondary,
    flexDirection: 'column',
    justifyContent: 'center',
    width: '50%',
    paddingVertical: 15,
    marginTop: 30,
    borderRadius: 5,
    marginBottom: 15,
  },
  defaultButton: {
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  greenIcon: {
    fontSize: 20,
    color: Colors.Green,
  },
  deleteButton: {
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  buttonText: {
    fontSize: 15,
    color: Colors.White,
    textAlign: 'center',
  },
  largeText: {
    fontSize: 30,
    color: Colors.White,
    textAlign: 'center',
  },
  denyButton: {
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  historyButton: {
    backgroundColor: Colors.Primary,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  acceptButton: {
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  icon: {
    fontSize: 15,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '500',
    width: '50%',
    textAlign: 'center',
    color: Colors.Primary,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 35,
    color: Colors.Red,
  },
  cardModal: {
    flex: 0.4,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.White,
    borderRadius: 10,
    padding: 20,
  },
  submitButton: {
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: 150,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '700',
    color: Colors.Primary,
  },
  logoutButton: {
    position: 'absolute',
    top: 45,
    left: 20,
    fontSize: 35,
    color: Colors.Secondary,
  },
});
