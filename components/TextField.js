import React, { Component } from 'react';
import {TextInput, Text, View, StyleSheet} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import COLORS from '../Colors';

const TextField = (props) => {
  return (
    <View style={props.rowStyle}>
      <Text style={props.iconStyle}>
        <FontAwesome>{props.icon}</FontAwesome>
      </Text>
      <TextInput
        placeholder={props.placeholder}
        returnKeyType={props.returnKeyType}
        style={props.style}
        placeholderTextColor={props.color}
        onChangeText={props.onChange}
        value={props.value}
        secureTextEntry={props.secure}
        autoCorrect={props.autoCorrect}
        keyboardType={props.keyboard}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: COLORS.PRIMARY,
    width: '90%',
    color: COLORS.PRIMARY
  },
  icon: {
    color: COLORS.PRIMARY,
    fontSize: 30,
    marginRight: 10,
    marginTop: 13
  },
});

export default TextField;

TextField.defaultProps = {
  style: styles.input,
  iconStyle: styles.icon,
  secure: false,
  color: COLORS.PRIMARY,
  autoCorrect: false,
  keyboard: "default",
  returnKeyType: "done"
}
