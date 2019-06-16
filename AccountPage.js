import React, { Component } from 'react';
import { StyleSheet, Text, View, Image, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { Font } from 'expo';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { ClientAccountForm } from './ClientAccountForm';
import { TrainerAccountForm } from './TrainerAccountForm';
import { Actions } from 'react-native-router-flux';
import COLORS from './Colors';

export class AccountPage extends Component {

  constructor(props) {
    super(props);
    this.goToMap = this.goToMap.bind(this);
  }

  goToMap() {
    if (this.form.state.change == true) {
      Alert.alert(
        "Are you sure you want to abandon your changes?",
        "",
        [
          { text: 'No' },
          { text: 'Yes', onPress: () => {
              Actions.map();
            }
          },
        ],
      );
    } else {
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
    let accountForm = null;
    if (this.props.trainer) {
      accountForm = <TrainerAccountForm ref={(form) => { this.form = form }}/>
    } else {
      accountForm = <ClientAccountForm ref={(form) => { this.form = form }}/>
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <Text style={styles.backButton} onPress={this.goToMap}>
          <FontAwesome>{Icons.arrowLeft}</FontAwesome>
        </Text>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.form}>
          <ScrollView>
            {accountForm}
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
