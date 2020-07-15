import React from 'react';
import {
  StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import ManagerSignupForm from '../forms/ManagerSignupForm';
import Colors from '../components/Colors';
import MasterStyles from '../components/MasterStyles';
import logo from '../images/logo.png';

export default function ManagerSignupPage() {
  return (
    <View style={MasterStyles.spacedContainer}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
        <ManagerSignupForm />
      </KeyboardAvoidingView>
      <View style={styles.linkContainer}>
        <View style={styles.textContain}>
          <TouchableOpacity onPressIn={Actions.LoginPage}>
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
  textContain: {
    height: 30,
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
