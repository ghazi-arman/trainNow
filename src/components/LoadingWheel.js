import React from 'react';
import {
  StyleSheet, Image, View,
} from 'react-native';
import MasterStyles from './MasterStyles';
import loading from '../images/loading.gif';

const LoadingWheel = () => (
  <View style={MasterStyles.centeredContainer}>
    <Image source={loading} style={styles.loading} />
  </View>
);

const styles = StyleSheet.create({
  loading: {
    width: '100%',
    resizeMode: 'contain',
  },
});

export default LoadingWheel;
