import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
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
import CommonStyles from '../components/CommonStyles';

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
      return null;
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
            {deleteButton}
          </View>
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
      balanceFormatted = this.state.balance === 0 ? '0.00' : (this.state.balance / 100).toFixed(2);
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
      <View style={[CommonStyles.flexStartContainer, { alignItems: 'flex-start' }]}>
        <BackButton style={styles.backButton} onPress={Actions.MapPage} />
        <Text style={styles.title}>Payments</Text>
        {balanceDiv}
        {this.renderCards()}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={CommonStyles.fullButton} onPress={Actions.CardPage}>
            <Text style={CommonStyles.buttonText}>Add Card</Text>
          </TouchableOpacity>
          {payoutText}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  cardRow: {
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
  buttonRow: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    fontSize: 30,
    color: Colors.Black,
    fontWeight: '600',
    margin: 15,
  },
  form: {
    width: '90%',
    height: '100%',
    paddingBottom: 50,
  },
  balanceText: {
    fontSize: 25,
    color: Colors.Primary,
    marginHorizontal: 15,
    marginBottom: 15,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
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
    marginHorizontal: 10,
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
    marginHorizontal: 10,
  },
  defaultButton: {
    backgroundColor: Colors.Green,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
});
