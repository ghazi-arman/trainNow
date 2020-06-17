import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Actions } from 'react-native-router-flux';
import PropTypes from 'prop-types';
import { ClientAccountForm } from '../forms/ClientAccountForm';
import { TrainerAccountForm } from '../forms/TrainerAccountForm';
import COLORS from '../components/Colors';
import Constants from '../components/Constants';

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
      <View style={styles.container}>
        <View style={styles.nameContainer}>
          <Text style={styles.backButton} onPress={this.goToMap}>
            <FontAwesome name="arrow-left" size={35} />
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

SettingsPage.propTypes = {
  userType: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 10,
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
    justifyContent: 'space-around',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    fontSize: 35,
    color: COLORS.SECONDARY,
    paddingBottom: 5,
  },
});
