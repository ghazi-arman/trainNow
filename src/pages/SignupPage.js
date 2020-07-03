import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import SignupForm from '../forms/SignupForm';
import Colors from '../components/Colors';
import MasterStyles from '../components/MasterStyles';

const logo = require('../images/logo.png');

export default function SignupPage() {
  return (
    <View style={MasterStyles.spacedContainer}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
        <SignupForm />
      </KeyboardAvoidingView>
      <View style={styles.linkContainer}>
        <View style={styles.textContain}>
          <TouchableOpacity onPress={() => Actions.LoginPage()}>
            <Text style={styles.linkText}>Have an Account?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: '50%',
    resizeMode: 'contain',
  },
  formContainer: {
    flex: 7,
    width: '80%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '80%',
  },
  linkContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  linkText: {
    color: Colors.Primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
