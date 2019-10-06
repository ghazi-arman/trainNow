import React, { Component } from 'react';
import * as Font from 'expo-font';
import { StyleSheet, Text, View, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { ClientAccountForm } from '../forms/ClientAccountForm';
import { TrainerAccountForm } from '../forms/TrainerAccountForm';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';

export class AccountPage extends Component {

  constructor(props) {
    super(props);
  }

  goToMap = () =>{
    if (this.form.state.change == true) {
      Alert.alert(
        "Unsaved Changes",
        "Are you sure you want to abandon your changes?",
        [
          { text: 'No' },
          { text: 'Yes', onPress: () => {
              Actions.MapPage();
            }
          },
        ],
      );
    } else {
      Actions.MapPage();
    }
  }

  render() {
    let accountForm;
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
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 20,
    fontSize: 35,
    color: COLORS.SECONDARY,
  }
});
