import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import PropTypes from 'prop-types';
import ClientAccountForm from '../forms/ClientAccountForm';
import TrainerAccountForm from '../forms/TrainerAccountForm';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import CommonStyles from '../components/CommonStyles';

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
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <BackButton onPress={this.goToMap} />
        <Text style={styles.title}>Settings</Text>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.formContainer}>
          {accountForm}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

SettingsPage.propTypes = {
  userType: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.flexStartContainer,
    alignItems: 'flex-start',
    height: '100%',
  },
  title: {
    fontSize: 30,
    marginHorizontal: 15,
    fontWeight: '700',
  },
  formContainer: {
    ...CommonStyles.centeredContainer,
  },
});
