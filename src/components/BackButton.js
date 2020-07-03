import React from 'react';
import {
  Text, StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Colors from './Colors';

const BackButton = (props) => (
  <Text style={styles.backButton} onPress={props.onPress}>
    <FontAwesome name="arrow-left" size={35} />
  </Text>
);

BackButton.propTypes = {
  onPress: PropTypes.func,
};

BackButton.defaultProps = {
  onPress: Actions.pop,
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    fontSize: 35,
    color: Colors.Secondary,
  },
});

export default BackButton;
