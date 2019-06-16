import React, { Component } from 'react';
import {TextInput, Text, View} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';

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
        autoCorrect={props.autoCorrect}
        keyboardType={props.keyboard}
      />
    </View>
  );
}
export default TextField;

TextField.defaultProps = {
  autoCorrect: false,
  keyboard: "default",
  returnKeyType: "done"
}
