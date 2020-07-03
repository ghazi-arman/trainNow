import React, { Component } from 'react';
import {
  StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import LoginForm from '../forms/LoginForm';
import Colors from '../components/Colors';
import MasterStyles from '../components/MasterStyles';

const logo = require('../images/logo.png');

export default function LoginPage() {
  return (
    <View style={MasterStyles.spacedContainer}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <LoginForm />
      </KeyboardAvoidingView>
      <View style={styles.linkContainer}>
        <View style={styles.textContain}>
          <TouchableOpacity onPress={Actions.ForgotPage}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.textContain}>
          <TouchableOpacity onPress={Actions.SignupPage}>
            <Text style={styles.linkText}>New User?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flex: 1,
    resizeMode: 'contain',
  },
  formContainer: {
    height: '30%',
    width: '80%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContain: {
    height: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '25%',
    width: '80%',
  },
  linkContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '20%',
  },
  linkText: {
    color: Colors.Primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
