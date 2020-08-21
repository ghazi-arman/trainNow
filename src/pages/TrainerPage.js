import React, { Component } from 'react';
import {
  View, Image, StyleSheet, Text, TouchableOpacity, Dimensions, ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import { FontAwesome } from '@expo/vector-icons';
import firebase from 'firebase';
import { Actions } from 'react-native-router-flux';
import { loadUser } from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';
import profileImage from '../images/profile.png';
import Colors from '../components/Colors';
import BackButton from '../components/BackButton';
import Constants from '../components/Constants';

export default class TrainerPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    const trainer = await loadUser(this.props.trainerKey);
    let image;
    try {
      image = await firebase.storage().ref().child(this.props.trainerKey).getDownloadURL();
    } catch {
      image = Image.resolveAssetSource(profileImage).uri;
    } finally {
      this.setState({ trainer, image });
    }
  }

  render() {
    if (!this.state.trainer || !this.state.image) {
      return <LoadingWheel />;
    }

    let nutritionPlanButton;
    if (this.state.trainer.nutritionPlan) {
      nutritionPlanButton = (
        <TouchableOpacity
          style={[styles.button, { width: '85%' }]}
          onPress={() => Actions.NutritionPage({ trainerKey: this.props.trainerKey })}
        >
          <Text style={styles.buttonText}>Nutrition Plan</Text>
        </TouchableOpacity>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton style={styles.backButton} />
        <Image style={styles.profileImage} source={{ uri: this.state.image }} />
        <Text style={styles.name}>{this.state.trainer.name}</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{this.state.trainer.rating.toFixed(1)}</Text>
            <Text style={styles.infoText}>Rating</Text>
          </View>
          <View style={[styles.infoBox, styles.infoBoxBorder]}>
            <Text style={styles.infoTitle}>
              $
              {this.state.trainer.rate}
            </Text>
            <Text style={styles.infoText}>Per Hour</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{this.state.trainer.sessions}</Text>
            <Text style={styles.infoText}>Sessions</Text>
          </View>
        </View>
        <View style={styles.aboutContainer}>
          <Text style={styles.infoTitle}>About</Text>
          <Text style={styles.bioText}>{this.state.trainer.bio}</Text>
          <View style={styles.aboutBox}>
            <FontAwesome style={styles.icon} name="vcard" color={Colors.Primary} size={25} />
            <Text style={styles.aboutTitle}>Certifications: </Text>
            <Text style={styles.aboutText}>{this.state.trainer.cert}</Text>
          </View>
          <View style={styles.aboutBox}>
            <FontAwesome style={styles.icon} name="book" color={Colors.Primary} size={25} />
            <Text style={styles.aboutTitle}>Specialities: </Text>
            <Text style={styles.aboutText}>{this.state.trainer.specialities}</Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Actions.BookingPage({
              clientKey: firebase.auth().currentUser.uid,
              trainerKey: this.props.trainerKey,
              gymKey: this.props.gymKey,
              bookedBy: Constants.clientType,
            })}
          >
            <Text style={styles.buttonText}>Book Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Actions.SchedulePage({ trainerKey: this.props.trainerKey })}
          >
            <Text style={styles.buttonText}>Schedule</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          {nutritionPlanButton}
        </View>
      </ScrollView>
    );
  }
}

TrainerPage.propTypes = {
  trainerKey: PropTypes.string.isRequired,
  gymKey: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  container: {
    ...CommonStyles.flexStartContainer,
    paddingBottom: 50,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    margin: 0,
  },
  profileImage: {
    height: 100,
    width: 100,
    borderRadius: 50,
    marginTop: Dimensions.get('window').height / 15,
  },
  name: {
    marginVertical: 20,
    fontWeight: '600',
    fontSize: 25,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: '20%',
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    paddingVertical: 20,
  },
  infoBox: {
    width: '33%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBoxBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.Gray,
  },
  infoTitle: {
    fontWeight: '600',
    fontSize: 22,
  },
  infoText: {
    fontSize: 17,
    color: Colors.DarkGray,
  },
  aboutContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 20,
  },
  aboutBox: {
    width: '60%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bioText: {
    fontSize: 15,
    marginVertical: 10,
  },
  aboutTitle: {
    fontSize: 15,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.DarkGray,
  },
  icon: {
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  button: {
    ...CommonStyles.shadow,
    width: '40%',
    backgroundColor: Colors.White,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.LightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    paddingVertical: 15,
  },
  buttonText: {
    color: Colors.Primary,
    fontWeight: '600',
    fontSize: 15,
  },
});
