import React, { Component } from 'react';
import {
  StyleSheet, Text, View, KeyboardAvoidingView, TouchableOpacity, Alert, Image,
} from 'react-native';
import firebase from 'firebase';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import bugsnag from '@bugsnag/expo';
import COLORS from '../components/Colors';
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

const loading = require('../images/loading.gif');

export default class PaymentPage extends Component {
  constructor(props) {
    super(props);
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
        this.goToMap();
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

  goToMap = () => Actions.MapPage();

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
              if (lastCard) {
                Alert.alert('You can only remove your default card by deleting your account.');
                return;
              }
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
        <Text style={{ marginTop: 10, fontSize: 20, color: COLORS.PRIMARY }}>
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
              <Text style={{ color: COLORS.WHITE }}>
                <FontAwesome name="check" size={15} />
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
            <Text style={{ color: COLORS.WHITE }}>
              <FontAwesome name="remove" size={15} />
            </Text>
          </TouchableOpacity>
        );
      } else {
        if (index === 0) {
          defaultButton = (<Text style={styles.greenIcon}><FontAwesome name="check-circle" size={20} /></Text>);
        } else {
          defaultButton = (
            <TouchableOpacity
              style={styles.defaultButton}
              onPress={() => this.setDefaultCard(this.state.user.stripeId, currCard.id)}
            >
              <Text style={{ color: COLORS.WHITE }}>
                <FontAwesome name="check" size={15} />
              </Text>
            </TouchableOpacity>
          );
        }
        deleteButton = (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => this.deleteCard(this.state.user.stripeId, currCard.id)}
          >
            <Text style={{ color: COLORS.WHITE }}>
              <FontAwesome name="remove" size={15} />
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
      return (
        <View style={styles.loadingContainer}>
          <Image source={loading} style={styles.loading} />
        </View>
      );
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
        <Text style={{
          fontSize: 20, textAlign: 'center', color: COLORS.PRIMARY, marginTop: 10,
        }}
        >
          Funds will be transfered daily
        </Text>
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.goToMap}>
            <FontAwesome name="arrow-left" size={35} />
          </Text>
          <Text style={styles.title}>Payments</Text>
        </View>
        {balanceDiv}
        <View style={styles.cardHolder}>
          {this.renderCards()}
        </View>
        <TouchableOpacity style={styles.button} onPress={Actions.CardPage}>
          <Text style={styles.buttonText}>
            <FontAwesome name="credit-card" size={30} />
            {' '}
            Add Card
            {' '}
          </Text>
        </TouchableOpacity>
        {payoutText}
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
    alignItems: 'center',
  },
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
  cardRow: {
    width: '95%',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 0.2,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  form: {
    width: '90%',
    height: '100%',
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35,
    color: COLORS.SECONDARY,
  },
  buttonText: {
    fontSize: 30,
    color: '#f6f5f5',
    textAlign: 'center',
  },
  balanceText: {
    fontSize: 30,
    color: COLORS.SECONDARY,
    textAlign: 'center',
  },
  button: {
    borderRadius: 5,
    backgroundColor: COLORS.SECONDARY,
    flexDirection: 'column',
    justifyContent: 'center',
    width: 200,
    height: 50,
    marginTop: 10,
  },
  icon: {
    fontSize: 15,
  },
  greenIcon: {
    marginTop: 10,
    height: 30,
    width: 30,
    fontSize: 20,
    color: COLORS.GREEN,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.RED,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  defaultButton: {
    backgroundColor: COLORS.GREEN,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
  },
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
  loadingContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
