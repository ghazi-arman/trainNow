import React, {Component} from 'react';
import PopupDialog from 'react-native-popup-dialog';
import { Picker, Platform, StyleSheet, Text, View, TextInput, Button, Alert } from 'react-native';
import DateTimePicker from './Datepick.js';

class Popup extends React.Component{

  constructor(props) {
    super(props);
    var now = new Date().toLocaleString();
    this.state = {
      name: '',
      details: '',
      eventStartDate: now,
      eventEndDate: now,
      tag: 'Food',
    }

    console.log(this.state.eventStartDate);
  }

  show(lat, long) {
    this.lat = lat;
    this.long = long;
    this.popupDialog.show();
  }

  sendInformation() {

    // name and time must be filled out, description and tag are optional
    if(this.state.name === '') {
      Alert.alert("Please input an event name!");
      return;
    }
    var now = new Date().getTime();
    var start = new Date(this.state.eventStartDate).getTime();
    var end = new Date(this.state.eventEndDate).getTime();
    // past is invalid
    if(start < now - 86400000 || end <= start) {
      Alert.alert("Invalid event time!");
      return;
    }


    let dbRef = this.props.db.database().ref('events');
    dbRef.push({
      coordinate: {latitude: this.lat, longitude: this.long},
      description: this.state.details,
      title: this.state.name,
      date: {
        // milliseconds since epoch
        start: new Date(this.state.eventStartDate).getTime(),
        end: new Date(this.state.eventEndDate).getTime()
      },
      tag: this.state.tag,
      score: 0
    });
    console.log(this.state.name)
    console.log(this.state.details)
    console.log(this._startDateTimePicker.state.date)
    console.log(this._endDateTimePicker.state.date)
    console.log(this.long)
    console.log(this.lat)
    this.popupDialog.dismiss()

    this.refs['textInput'].clear(0)
    this.refs['textInputD'].clear(0)
    
    var now = new Date().toLocaleString();
    this.setState({
      name: '',
      details: '',
      eventStartDate: now,
      eventEndDate: now,
      tag: 'Food',
    });
  }


  setStartDate = (date) => this.setState({eventStartDate: date});
  setEndDate = (date) => this.setState({eventEndDate: date});

  render() {
    return (
      <PopupDialog height={380}
        ref={(popupDialog) => { this.popupDialog = popupDialog; }}
      >
        <View>
        <TextInput
          style={{height: 40}}
          placeholder="Enter Event Name"
          onChangeText={(name) => this.setState({name})}
          ref = {"textInput"}
        />
        <Text style={{fontSize:17}}>Choose Event Start Time</Text>

        <DateTimePicker
          ref={(startDateTimePicker) => {this._startDateTimePicker = startDateTimePicker;}}
          onChange={this.setStartDate}/>
        <Button
          title={this.state.eventStartDate.substring()}
          color="#4B0082"
          onPress={() => this._startDateTimePicker._showDateTimePicker()}
        />
        <Text style={{fontSize: 17}}>Choose Event End Time</Text>

        <DateTimePicker
          ref={(endDateTimePicker) => {this._endDateTimePicker = endDateTimePicker;}}
          onChange={this.setEndDate}/>
        <Button
          title={this.state.eventEndDate.toString()}
          color="#4B0082"
          onPress={() => this._endDateTimePicker._showDateTimePicker()}
                  // this.setState({textValue:{this._endDateTimePicker.date}})}
        />
        <TextInput
          style={{height: 40}}
          placeholder="Enter Event Details"
          onChangeText={(details) => this.setState({details})}
          ref = {"textInputD"}
        />
        <Picker
          selectedValue={this.state.tag.toString()}
          onValueChange={(itemValue, itemIndex) => this.setState({tag: itemValue})}>
          <Picker.Item label="Food" value="Food" />
          <Picker.Item label="Cookie" value="Cookie" />
          <Picker.Item label="Gluten Free" value="Gluten Free" />
          <Picker.Item label="Vegetarian" value="Vegetarian" />   
          <Picker.Item label="Other" value="Other" />       
        </Picker>
        <Button
          title="Create"
          color="#32CD32"
          accessibilityLabel="Learn more about this purple button"
          onPress={() => this.sendInformation()}
        />
        <Button
          title="Cancel"
          color="#DC143C"
          accessibilityLabel="Learn more about this purple button"
          onPress={() => this.popupDialog.dismiss()}
        />
        </View>
      </PopupDialog>
      );
    }
  }
const styles = StyleSheet.create({
    popup: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '.8',
  },
});

export default Popup;
