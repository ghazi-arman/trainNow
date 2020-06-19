import React from 'react';
import {
  TextInput, Text, View, StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import COLORS from './Colors';

const TextField = (props) => (
  <View style={props.rowStyle}>
    <Text style={props.iconStyle}>
      <FontAwesome name={props.icon} size={30} />
    </Text>
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
    />
  </View>
);
const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: COLORS.PRIMARY,
    width: '85%',
    color: COLORS.PRIMARY,
  },
  icon: {
    color: COLORS.PRIMARY,
    fontSize: 30,
    marginRight: 10,
    marginTop: 13,
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
};

TextField.defaultProps = {
  rowStyle: styles.inputRow,
  style: styles.input,
  iconStyle: styles.icon,
  secure: false,
  color: COLORS.PRIMARY,
  autoCorrect: false,
  keyboard: 'default',
  returnKeyType: 'done',
  multiline: false,
  autoCapitalize: 'none',
  editable: true,
  onSubmitEditing: null,
  value: null,
};
