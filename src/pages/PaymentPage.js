import React, { Component } from 'react';
import {
  StyleSheet, Text, View, KeyboardAvoidingView, TouchableOpacity, Alert,
} from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import Colors from '../components/Colors';
import {
  loadUser,
  loadTrainerCards,
  loadCards,
  getCardIcon,
  deleteCard,
  setDefaultCard,
  loadBalance,
  deleteTrainerCard,
  setDefaultTrainerCard,
} from '../components/Functions';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import MasterStyles from '../components/MasterStyles';

export default class PaymentPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      cards: null,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.cards || !this.state.balance || !this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        if (user.trainerType === Constants.managedType) {
          Alert.alert('You do not have access to this page.');
          Actions.reset('MapPage');
          return;
        }
        let balance;
        let cards;
        if (user.type === Constants.trainerType) {
          balance = await loadBalance(user.stripeId);
          cards = await loadTrainerCards(user.stripeId);
        } else {
          cards = await loadCards(user.stripeId);
        }
        this.setState({ user, cards, balance });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error accessing your payment information.');
        Actions.MapPage();
      }
    }
  }

  async setDefaultCard(stripeId, cardId) {
    Alert.alert(
      'Are you sure you want to make this your default card?',
      '',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await setDefaultCard(stripeId, cardId);
              const cards = await loadCards(stripeId);
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

  deleteCard = async (stripeId, cardId) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const lastCard = this.state.cards.length === 1;
              await deleteCard(stripeId, cardId, lastCard);
              const cards = await loadCards(stripeId);
              this.setState({ cards });
            } catch (error) {
              this.bugsnagClient.notify(error);
              Alert.alert('There was an error. Please try again');
            }
          },
        },
      ],
    );
  }

  async deleteTrainerCard(stripeId, cardId, defaultCard) {
    if (defaultCard) {
      Alert.alert('You cannot delete your default card. Email us to remove your account.');
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
              Alert.alert('There was an error. Please try again.');
            }
          },
        },
      ],
    );
  }

  renderCards() {
    if (!this.state.cards || !this.state.cards.length) {
      return (
        <Text style={{ marginTop: 10, fontSize: 20, color: Colors.Primary }}>
          No Cards Added
        </Text>
      );
    }
    let index = 0;
    return this.state.cards.map((currCard) => {
      let deleteButton;
      let defaultButton;
      let defaultCard = false;
      if (this.state.user.type === Constants.trainerType) {
        if (currCard.default_for_currency) {
          defaultButton = (
            <Text style={styles.greenIcon}>
              <FontAwesome name="check-circle" size={30} color={Colors.Green} />
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
        deleteButton = (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => this.deleteTrainerCard(
              this.state.user.stripeId,
              currCard.id, defaultCard,
            )}
          >
            <Text>
              <FontAwesome name="remove" size={15} color={Colors.LightGray} />
            </Text>
          </TouchableOpacity>
        );
      } else {
        if (index === 0) {
          defaultButton = (
            <Text style={styles.greenIcon}>
              <FontAwesome name="check-circle" size={30} color={Colors.Green} />
            </Text>
          );
        } else {
          defaultButton = (
            <TouchableOpacity
              style={styles.defaultButton}
              onPress={() => this.setDefaultCard(this.state.user.stripeId, currCard.id)}
            >
              <Text>
                <FontAwesome name="check" size={15} color={Colors.LightGray} />
              </Text>
            </TouchableOpacity>
          );
        }
        deleteButton = (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => this.deleteCard(this.state.user.stripeId, currCard.id)}
          >
            <Text>
              <FontAwesome name="remove" size={15} color={Colors.LightGray} />
            </Text>
          </TouchableOpacity>
        );
      }
      index += 1;
      return (
        <View style={styles.cardRow} key={currCard.id}>
          <Text style={styles.icon}>{getCardIcon(currCard.brand)}</Text>
          <Text>
            ••••••
            {currCard.last4}
          </Text>
          <Text>
            {currCard.exp_month.toString()}
            {' '}
            /
            {' '}
            {currCard.exp_year.toString().substring(2, 4)}
          </Text>
          {defaultButton}
          {deleteButton}
        </View>
      );
    });
  }

  render() {
    if (!this.state.user || !this.state.cards) {
      return <LoadingWheel />;
    }
    let balanceDiv;
    let payoutText;
    let balanceFormatted;
    if (this.state.user.type === Constants.trainerType) {
      if (this.state.balance === 0) {
        balanceFormatted = '0.00';
      } else {
        balanceFormatted = (this.state.balance / 100).toFixed(2);
      }
      balanceDiv = (
        <Text style={styles.balanceText}>
          $
          {balanceFormatted}
        </Text>
      );
      payoutText = (
        <Text style={{ fontSize: 20, color: Colors.Primary, marginTop: 10 }}>
          Funds transfered daily
        </Text>
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={MasterStyles.flexStartContainer}>
        <View style={styles.nameContainer}>
          <BackButton style={styles.backButton} onPress={Actions.MapPage} />
          <Text style={styles.title}>Payments</Text>
        </View>
        {balanceDiv}
        <View style={styles.cardHolder}>
          {this.renderCards()}
        </View>
        <TouchableOpacity style={[styles.button, MasterStyles.shadow]} onPress={Actions.CardPage}>
          <Text style={styles.buttonText}>Add Card</Text>
        </TouchableOpacity>
        {payoutText}
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  cardHolder: {
    flex: 0.5,
    marginTop: 20,
    backgroundColor: '#f6f5f5',
    width: '90%',
    borderRadius: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
  },
  cardRow: {
    width: '95%',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nameContainer: {
    height: '15%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    color: Colors.Primary,
    fontWeight: '700',
  },
  form: {
    width: '90%',
    height: '100%',
    paddingBottom: 50,
  },
  buttonText: {
    fontSize: 25,
    fontWeight: '600',
    color: Colors.Primary,
    textAlign: 'center',
  },
  balanceText: {
    fontSize: 30,
    color: Colors.Primary,
    textAlign: 'center',
  },
  button: {
    borderRadius: 10,
    width: '80%',
    height: 50,
    marginTop: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 15,
  },
  greenIcon: {
    fontSize: 20,
    color: Colors.Green,
    width: 30,
    height: 30,
    marginHorizontal: 5,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.Red,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    width: 30,
    height: 30,
    marginHorizontal: 5,
  },
  defaultButton: {
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 5,
  },
});
