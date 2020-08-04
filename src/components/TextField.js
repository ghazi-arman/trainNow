import React from 'react';
import {
  TextInput, Text, View, StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import Colors from './Colors';

const TextField = (props) => (
  <View style={props.rowStyle}>
    <View style={styles.icon}>
      <FontAwesome name={props.icon} size={30} color={Colors.Primary} />
    </View>
    <TextInput
      placeholder={props.placeholder}
      returnKeyType={props.returnKeyType}
      style={props.style}
      placeholderTextColor={props.color}
      onChangeText={props.onChange}
      value={props.value}
      multiline={props.multiline}
      secureTextEntry={props.secure}
      autoCorrect={props.autoCorrect}
      autoCapitalize={props.autoCapitalize}
      keyboardType={props.keyboard}
      onSubmitEditing={props.onSubmitEditing}
      editable={props.editable}
      maxLength={props.maxLength}
    />
  </View>
);
const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: Colors.Primary,
    width: '85%',
    color: Colors.Primary,
  },
  icon: {
    height: 40,
    width: '15%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
});

export default TextField;

TextField.propTypes = {
  rowStyle: PropTypes.object,
  style: PropTypes.object,
  iconStyle: PropTypes.object,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string,
  keyboard: PropTypes.string,
  returnKeyType: PropTypes.string,
  autoCapitalize: PropTypes.string,
  placeholder: PropTypes.string.isRequired,
  value: PropTypes.string,
  secure: PropTypes.bool,
  autoCorrect: PropTypes.bool,
  multiline: PropTypes.bool,
  editable: PropTypes.bool,
  onSubmitEditing: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
};

TextField.defaultProps = {
  rowStyle: styles.inputRow,
  style: styles.input,
  iconStyle: styles.icon,
  secure: false,
  color: Colors.Primary,
  autoCorrect: false,
  keyboard: 'default',
  returnKeyType: 'done',
  multiline: false,
  autoCapitalize: 'none',
  editable: true,
  onSubmitEditing: null,
  value: null,
  maxLength: null,
};
