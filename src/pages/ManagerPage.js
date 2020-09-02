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
import CommonStyles from '../components/CommonStyles';

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
    } finally {
      const gym = await loadGym(this.props.gymKey);
      this.setState({ gym });
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
              Alert.alert('Trainer removed from gym.');
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error when trying to delete that trainer.');
            } finally {
              const gym = await loadGym(this.props.gymKey);
              this.setState({ gym });
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
      Alert.alert('Trainer added to gym. Please set the trainer rate immediately as it defaults to 50.');
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error when accepting that trainer.');
    } finally {
      const gym = await loadGym(this.props.gymKey);
      this.setState({ gym });
    }
  }

  renderPending = () => {
    if (!this.state.gym.pendingtrainers) {
      return (
        <Text style={{ marginHorizontal: 15, fontSize: 20, color: Colors.Primary }}>
          No Pending Trainers
        </Text>
      );
    }
    return Object.keys(this.state.gym.pendingtrainers).map((key) => {
      const trainer = this.state.gym.pendingtrainers[key];
      trainer.userKey = key;
      return (
        <View key={trainer.name} style={styles.containerRow}>
          <Text style={styles.name}>{trainer.name}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={() => this.denyTrainer(key)}
            >
              <Text style={styles.buttonText}><FontAwesome name="close" size={18} /></Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => this.acceptTrainer(key)}
            >
              <Text style={styles.buttonText}><FontAwesome name="check" size={18} /></Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  }

  renderTrainers = () => {
    if (!this.state.gym.trainers) {
      return (
        <Text style={{ marginHorizontal: 15, fontSize: 20, color: Colors.Primary }}>
          No Trainers
        </Text>
      );
    }
    return Object.keys(this.state.gym.trainers).map((key) => {
      const trainer = this.state.gym.trainers[key];
      trainer.userKey = key;
      return (
        <View key={trainer.name} style={styles.containerRow}>
          <Text style={styles.name}>{trainer.name}</Text>
          <View style={styles.buttonRow}>
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
              onPress={() => this.setState({
                selectedTrainer: trainer,
                rateModal: true,
                rate: String(trainer.rate),
              })}
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
        <Text style={{ marginHorizontal: 15, fontSize: 20, color: Colors.Primary }}>
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
            <FontAwesome name="check-circle" size={30} />
          </Text>
        );
        defaultCard = true;
      } else {
        defaultButton = (
          <TouchableOpacity
            style={styles.defaultButton}
            onPress={() => this.setDefaultTrainerCard(this.state.user.stripeId, currCard.id)}
          >
            <Text>
              <FontAwesome name="check" size={15} color={Colors.LightGray} />
            </Text>
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.containerRow} key={currCard.id}>
          <Text style={styles.icon}>{getCardIcon(currCard.brand)}</Text>
          <Text style={{ width: '30%' }}>
            ••••••
            {currCard.last4}
          </Text>
          <Text style={{ width: '15%' }}>
            {currCard.exp_month.toString()}
            {' '}
            /
            {' '}
            {currCard.exp_year.toString().substring(2, 4)}
          </Text>
          <View style={styles.buttonRow}>
            {defaultButton}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => this.deleteTrainerCard(
                this.state.user.stripeId,
                currCard.id,
                defaultCard,
              )}
            >
              <Text>
                <FontAwesome name="remove" size={15} color={Colors.LightGray} />
              </Text>
            </TouchableOpacity>
          </View>
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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logoutButton} onPress={this.logout}>
          <FontAwesome name="power-off" size={35} />
        </Text>
        <Text style={styles.title}>Pending</Text>
        {this.renderPending()}
        <Text style={styles.title}>Trainers</Text>
        {this.renderTrainers()}
        <Text style={styles.title}>
          $
          {' '}
          {balanceFormatted}
        </Text>
        {this.renderCards()}
        <View style={styles.paymentButtonRow}>
          <TouchableOpacity style={styles.button} onPress={Actions.CardPage}>
            <Text style={styles.paymentButtonText}>Add Card</Text>
          </TouchableOpacity>
          <Text style={styles.paymentDetails}>* Funds transfered daily</Text>
        </View>
        <Modal
          isVisible={this.state.rateModal}
          onBackdropPress={this.hideRateModal}
        >
          <KeyboardAvoidingView behavior="padding" style={styles.cardModal}>
            <Text style={styles.closeButton} onPress={this.hideRateModal}>
              <FontAwesome name="close" size={35} />
            </Text>
            <Text style={styles.title}>{trainerName}</Text>
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
  container: {
    ...CommonStyles.flexStartContainer,
    alignItems: 'flex-start',
    paddingBottom: 75,
  },
  title: {
    margin: 15,
    fontSize: 30,
    color: Colors.Black,
    fontWeight: '700',
  },
  containerRow: {
    width: '100%',
    height: 80,
    padding: 10,
    backgroundColor: Colors.LightGray,
    borderWidth: 1,
    borderColor: Colors.Gray,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  navText: {
    fontSize: 25,
    color: Colors.Primary,
    textAlign: 'center',
  },
  paymentButtonText: {
    fontSize: 20,
    color: Colors.Primary,
    textAlign: 'center',
  },
  buttonRow: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    height: 50,
    width: '45%',
    borderRadius: 10,
  },
  defaultButton: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  greenIcon: {
    fontSize: 20,
    color: Colors.Green,
    width: 30,
    height: 30,
    marginHorizontal: 10,
    textAlign: 'center',
  },
  deleteButton: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    width: 30,
    height: 30,
    marginHorizontal: 10,
  },
  buttonText: {
    fontSize: 15,
    color: Colors.LightGray,
    textAlign: 'center',
  },
  largeText: {
    fontSize: 30,
    color: Colors.LightGray,
    textAlign: 'center',
  },
  denyButton: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  historyButton: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.Primary,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  acceptButton: {
    ...CommonStyles.shadow,
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  icon: {
    fontSize: 15,
  },
  name: {
    fontSize: 18,
    padding: 10,
    fontWeight: '500',
    width: '50%',
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
    backgroundColor: Colors.LightGray,
    borderRadius: 10,
    padding: 20,
  },
  submitButton: {
    ...CommonStyles.shadow,
    borderRadius: 5,
    backgroundColor: Colors.Secondary,
    paddingVertical: 15,
    width: 150,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoutButton: {
    marginHorizontal: 15,
    marginTop: 35,
    fontSize: 35,
    color: Colors.Secondary,
  },
  paymentButtonRow: {
    paddingHorizontal: 10,
    marginVertical: 10,
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  paymentDetails: {
    fontSize: 15,
    marginTop: 15,
    textAlign: 'center',
    color: Colors.Primary,
  },
});
