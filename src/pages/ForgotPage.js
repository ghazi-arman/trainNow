import React from 'react';
import {
  StyleSheet, View, Image, KeyboardAvoidingView,
} from 'react-native';
import ForgotForm from '../forms/ForgotForm';
import CommonStyles from '../components/CommonStyles';
import logo from '../images/logo.png';

export default function ForgotPage() {
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <View style={styles.formContainer}>
        <ForgotForm />
      </View>
    </KeyboardAvoidingView>
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
