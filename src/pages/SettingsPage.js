import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import PropTypes from 'prop-types';
import ClientAccountForm from '../forms/ClientAccountForm';
import TrainerAccountForm from '../forms/TrainerAccountForm';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import MasterStyles from '../components/MasterStyles';

export default class SettingsPage extends Component {
  goToMap = () => {
    if (this.form.state.change) {
      Alert.alert(
        'Unsaved Changes',
        'Are you sure you want to abandon your changes?',
        [
          { text: 'No' },
          {
            text: 'Yes',
            onPress: () => Actions.MapPage(),
          },
        ],
      );
    } else {
      Actions.MapPage();
    }
  }

  render() {
    let accountForm;
    if (this.props.userType === Constants.trainerType) {
      accountForm = (<TrainerAccountForm ref={(form) => { this.form = form; }} />);
    } else {
      accountForm = (<ClientAccountForm ref={(form) => { this.form = form; }} />);
    }
    return (
      <View style={MasterStyles.spacedContainer}>
        <View style={styles.nameContainer}>
          <BackButton style={styles.backButton} onPress={this.goToMap} />
          <Text style={styles.title}>Settings</Text>
        </View>
        <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
          <ScrollView contentContainerStyle={styles.center}>
            {accountForm}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }
}

SettingsPage.propTypes = {
  userType: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    height: '15%',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
  },
  title: {
    fontSize: 34,
    color: Colors.Primary,
    fontWeight: '700',
  },
  formContainer: {
    height: '85%',
    width: '90%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});
