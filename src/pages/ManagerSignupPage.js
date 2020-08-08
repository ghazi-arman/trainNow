import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import ManagerSignupForm from '../forms/ManagerSignupForm';
import CommonStyles from '../components/CommonStyles';
import logo from '../images/logo.png';

export default function ManagerSignupPage() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={logo} />
      </View>
      <KeyboardAvoidingView style={styles.formContainer} behavior="padding">
        <ManagerSignupForm />
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
