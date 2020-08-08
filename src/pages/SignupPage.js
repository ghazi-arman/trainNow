import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import SignupForm from '../forms/SignupForm';
import CommonStyles from '../components/CommonStyles';
import logo from '../images/logo.png';

export default function SignupPage() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
        <SignupForm />
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
    height: '10%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    flex: 0.5,
    resizeMode: 'contain',
  },
  formContainer: {
    ...CommonStyles.flexStartContainer,
    width: '80%',
  },
});
