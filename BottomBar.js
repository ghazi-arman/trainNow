import React, { Component } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Font} from 'expo';

export class BottomBar extends Component {
	
	constructor(props) {
		super(props);
	}

	componentDidMount(){
		Font.loadAsync({
      		FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf'),
      		fontAwesome: require('./fonts/font-awesome-4.7.0/fonts/fontawesome-webfont.ttf'),
      		lato: require('./fonts/Lato/Lato-Regular.ttf'),
      		latoBold: require('./fonts/Lato/Lato-Bold.ttf')
    	});
	}

	render(){
	return(
		<View style={styles.bottomBar}>

          <TouchableOpacity
              style={styles.centerButton}
              onPressIn={this.props.location}>
            <Text style={{ fontSize: 50, color: '#08d9d6' }}>
                <FontAwesome>{Icons.compass}</FontAwesome>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.accountButton}
              onPressIn={this.props.account}>
            <Text style={{ fontSize: 50, color: '#08d9d6' }}>
                <FontAwesome>{Icons.user}</FontAwesome>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.accountButton}
              onPressIn={this.props.pending}>
            <Text style={{ fontSize: 50, color: '#08d9d6' }}>
                <FontAwesome>{Icons.comment}</FontAwesome>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.accountButton}
              onPressIn={this.props.history}>
            <Text style={{ fontSize: 50, color: '#08d9d6' }}>
                <FontAwesome>{Icons.list}</FontAwesome>
            </Text>
          </TouchableOpacity>
        </View>
		)
	}
}

const styles = StyleSheet.create({
	bottomBar: {
	    width: '100%',
	    position: 'absolute',
	    flex: 1,
	    flexDirection: 'row',
	    justifyContent: 'space-around',
	    bottom: 0,
	    backgroundColor: '#252a34'
  	},
	centerButton: {
    	position: 'relative',
    	borderRadius: 35,
    	margin: 10
  	},
  	accountButton: {
    	borderRadius:35,
    	margin: 10
  	},
});
