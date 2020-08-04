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
  <TouchableOpacity style={[styles.button, MasterStyles.shadow, props.style]} onPress={props.onPress}>
    <FontAwesome name="arrow-left" color={Colors.Black} size={25} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    marginTop: Dimensions.get('window').height / 20,
    marginBottom: 10,
    marginHorizontal: 15,
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

BackButton.propTypes = {
  onPress: PropTypes.func,
  style: PropTypes.object
};

BackButton.defaultProps = {
  onPress: Actions.pop,
  style: null,
};

export default BackButton;
