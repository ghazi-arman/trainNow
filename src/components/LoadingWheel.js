import React from 'react';
import {
  StyleSheet, Image, View,
} from 'react-native';

const loading = require('../images/loading.gif');

const LoadingWheel = () => (
  <View style={styles.container}>
    <Image source={loading} style={styles.loading} />
  </View>
);

const styles = StyleSheet.create({
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
  container: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingWheel;
