import React, { Component } from 'react';
import { StyleSheet, Text, View, Image, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { LoginForm } from '../forms/LoginForm'
import { Actions } from 'react-native-router-flux';
import COLORS from '../components/Colors';
const logo = require('../images/logo.png');

export class LoginPage extends Component {
  signup() {
    Actions.SignupPage();
  }

  forgot() {
    Actions.ForgotPage();
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image style={styles.logo} source={logo} />
        </View>
        <KeyboardAvoidingView behavior='padding' style={styles.formContainer}>
          <LoginForm />
        </KeyboardAvoidingView>
        <View style={styles.linkContainer}>
          <View style={styles.textContain}>
            <TouchableOpacity onPress={this.forgot}>
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.textContain}>
            <TouchableOpacity onPress={this.signup}>
              <Text style={styles.linkText}>New User?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.WHITE,
  },
  logo: {
    flex: 1,
    resizeMode: 'contain'
  },
  formContainer: {
    height: '30%',
    width: '80%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContain: {
    height: 30
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '25%',
    width: '80%'
  },
  linkContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: "20%",
  },
  linkText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '500',
  }
});
