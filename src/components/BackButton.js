import React from 'react';
import {
  TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import { Actions } from 'react-native-router-flux';
import { FontAwesome } from '@expo/vector-icons';
import Colors from './Colors';
import MasterStyles from './MasterStyles';

const BackButton = (props) => (
  <TouchableOpacity style={[styles.button, MasterStyles.shadow]} onPress={props.onPress}>
    <FontAwesome name="arrow-left" color={Colors.Black} size={25} />
  </TouchableOpacity>
);

BackButton.propTypes = {
  onPress: PropTypes.func,
};

BackButton.defaultProps = {
  onPress: Actions.pop,
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: Dimensions.get('window').height / 20,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.Black,
  },
});

export default BackButton;
