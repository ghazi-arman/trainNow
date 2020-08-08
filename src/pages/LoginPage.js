import React from 'react';
import {
  StyleSheet, View, Image, KeyboardAvoidingView,
} from 'react-native';
import LoginForm from '../forms/LoginForm';
import CommonStyles from '../components/CommonStyles';
import logo from '../images/logo.png';

export default function LoginPage() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
        <LoginForm />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.flexStartContainer,
    flex: 1,
  },
  logoContainer: {
    width: '80%',
    height: '35%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    flex: 1,
    resizeMode: 'contain',
  },
  formContainer: {
    ...CommonStyles.centeredContainer,
    width: '80%',
    marginVertical: 20,
  },
});
