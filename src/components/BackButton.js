import React from 'react';
import {
  Text, StyleSheet,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import COLORS from './Colors';

const BackButton = () => (
  <Text style={styles.backButton} onPress={Actions.pop}>
    <FontAwesome name="arrow-left" size={35} />
  </Text>
);

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    fontSize: 35,
    color: COLORS.SECONDARY,
  },
});

export default BackButton;
