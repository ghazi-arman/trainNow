import React from 'react';
import {
  StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import ForgotForm from '../forms/ForgotForm';
import Colors from '../components/Colors';
import MasterStyles from '../components/MasterStyles';

const logo = require('../images/logo.png');

export default function ForgotPage() {
  return (
    <KeyboardAvoidingView behavior="padding" style={MasterStyles.spacedContainer}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <View style={styles.formContainer}>
        <ForgotForm />
      </View>
      <View style={styles.linkContainer}>
        <View style={styles.textContain}>
          <TouchableOpacity onPress={() => Actions.LoginPage()}>
            <Text style={styles.linkText}>Have an Account?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '20%',
    width: '80%',
    marginTop: 25,
  },
  logo: {
    flex: 1,
    resizeMode: 'contain',
  },
  textContain: {
    height: 30,
  },
  formContainer: {
    height: '35%',
    width: '80%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '20%',
  },
  linkText: {
    color: Colors.Primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
