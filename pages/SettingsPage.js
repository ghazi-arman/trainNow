import React, { Component } from 'react';
import * as Font from 'expo-font';
import { StyleSheet, Text, View, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { ClientAccountForm } from '../forms/ClientAccountForm';
import { TrainerAccountForm } from '../forms/TrainerAccountForm';
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';

export class SettingsPage extends Component {

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
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.goToMap}>
            <FontAwesome>{Icons.arrowLeft}</FontAwesome>
          </Text>
          <Text style={styles.title}>Settings</Text>
        </View>
        <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
          <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
            {accountForm}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE
  },
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 34,
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  formContainer: {
    flex: 7,
    width: '90%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35,
    color: COLORS.SECONDARY,
  }
});
