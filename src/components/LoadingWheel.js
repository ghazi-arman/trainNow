import React from 'react';
import {
  StyleSheet, Image, View,
} from 'react-native';
import CommonStyles from './CommonStyles';
import loading from '../images/loading.gif';

const LoadingWheel = () => (
  <View style={styles.container}>
    <Image source={loading} style={styles.loading} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.centeredContainer,
    flex: 1,
  },
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
});

export default LoadingWheel;
