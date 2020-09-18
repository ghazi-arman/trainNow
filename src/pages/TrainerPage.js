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

  renderNutritionPlans = () => {
    if (!this.state.trainer.nutritionPlans) {
      return (<Text style={[styles.bioText, { marginHorizontal: 10 }]}>None</Text>);
    }

    return Object.keys(this.state.trainer.nutritionPlans).map((key) => {
      const plan = this.state.trainer.nutritionPlans[key];
      return (
        <View style={styles.planContainer} key={key}>
          <View style={styles.nameContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planInfo}>
              $
              {plan.cost}
              {plan.monthly ? '/month' : null}
            </Text>
          </View>
          <View style={styles.linkContainer}>
            <Text
              style={styles.link}
              onPress={() => Actions.NutritionPlanPage({
                trainerKey: this.props.trainerKey,
                planKey: key,
              })}
            >
              Details
            </Text>
          </View>
        </View>
      );
    });
  }

  renderWorkoutPlans = () => {
    if (!this.state.trainer.workoutPlans) {
      return (<Text style={[styles.bioText, { marginHorizontal: 10 }]}>None</Text>);
    }

    return Object.keys(this.state.trainer.workoutPlans).map((key) => {
      const plan = this.state.trainer.workoutPlans[key];
      return (
        <View style={styles.planContainer} key={key}>
          <View style={styles.nameContainer}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planInfo}>
              $
              {plan.cost}
              {plan.monthly ? '/month' : null}
            </Text>
          </View>
          <View style={styles.linkContainer}>
            <Text
              style={styles.link}
              onPress={() => Actions.WorkoutPlanPage({
                trainerKey: this.props.trainerKey,
                planKey: key,
              })}
            >
              Details
            </Text>
          </View>
        </View>
      );
    });
  }

  render() {
    if (!this.state.trainer || !this.state.image) {
      return <LoadingWheel />;
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
          <Text style={styles.infoTitle}>Workout Plans</Text>
          <View style={{ width: '90%' }}>
            {this.renderWorkoutPlans()}
          </View>
          <Text style={styles.infoTitle}>Nutrition Plans</Text>
          <View style={{ width: '90%' }}>
            {this.renderNutritionPlans()}
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
    height: 100,
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
    fontSize: 20,
  },
  infoText: {
    fontSize: 17,
    color: Colors.DarkGray,
  },
  aboutContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 10,
  },
  aboutBox: {
    width: '60%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: 10,
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
    marginHorizontal: 10,
    marginBottom: 25,
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
  planContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    padding: 10,
  },
  nameContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '85%',
  },
  planName: {
    maxWidth: '70%',
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Black,
  },
  planInfo: {
    fontWeight: '400',
    fontSize: 12,
    color: Colors.DarkGray,
  },
  link: {
    fontWeight: '500',
    fontSize: 14,
    color: Colors.Primary,
  },
});
