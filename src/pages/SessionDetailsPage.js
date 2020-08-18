import React, { Component } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import MapView from 'react-native-maps';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { dateToString, reportSession, renderStars } from '../components/Functions';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';
import Colors from '../components/Colors';
import BackButton from '../components/BackButton';
import markerImage from '../images/marker.png';
import Constants from '../components/Constants';

export default class SessionDetailsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.bugsnagClient = bugsnag();
  }

  reportSession = async () => {
    if (this.state.pressed) {
      return;
    }
    this.setState({ pressed: true });
    try {
      await reportSession(this.props.session, firebase.auth.currentUser.uid, this.state.report);
    } catch (error) {
      this.bugsnagClient.notify(error);
      Alert.alert('There was an error sending the report. Please try again later.');
    } finally {
      this.setState({ pressed: false });
    }
  }

  render() {
    if (!this.props.session) {
      return <LoadingWheel />;
    }

    const userId = !this.props.managerView
      ? firebase.auth().currentUser.uid
      : this.props.session.trainerKey;
    const name = this.props.session.trainerKey === userId
      ? this.props.session.clientName
      : this.props.session.trainerName;
    const rating = this.props.session.trainerKey === userId
      ? this.props.session.trainerRating
      : this.props.session.clientRating;

    const total = (
      parseInt(this.props.session.duration, 10) * (this.props.session.rate / 60)
    ).toFixed(2);
    const percentage = this.props.session.regular
      ? Constants.regularClientPercentage
      : Constants.newClientPercentage;
    const payout = (total - total * percentage).toFixed(2);

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <BackButton />
        <Text style={styles.title}>
          Session with
          {' '}
          {name}
        </Text>
        <View style={styles.infoContainer}>
          <View style={styles.textRow}>
            <Text style={styles.bold}>Name:</Text>
            <Text style={styles.details}>{name}</Text>
          </View>
          <View style={styles.textRow}>
            <Text style={styles.bold}>Time:</Text>
            <Text style={styles.details}>{dateToString(this.props.session.start)}</Text>
          </View>
          <View style={styles.textRow}>
            <Text style={styles.bold}>Gym:</Text>
            <Text style={styles.details}>{this.props.session.gymName}</Text>
          </View>
          <View style={styles.textRow}>
            <Text style={styles.bold}>Rating:</Text>
            <Text style={[styles.details, { color: Colors.Primary }]}>{renderStars(rating)}</Text>
          </View>
          <View style={styles.textRow}>
            <Text style={styles.bold}>
              {this.props.session.trainerKey === userId ? 'Earned:' : 'Cost:'}
            </Text>
            <Text style={styles.details}>
              $
              {this.props.session.trainerKey === userId ? payout : total}
            </Text>
          </View>
        </View>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={
              !this.props.session.virtual
                ? {
                  latitude: this.props.session.location.latitude,
                  longitude: this.props.session.location.longitude,
                  latitudeDelta: 0.0422,
                  longitudeDelta: 0.0221,
                }
                : this.props.userRegion
            }
            pitchEnabled={false}
            rotateEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <MapView.Marker
              key={this.props.session.key}
              coordinate={this.props.session.virtual
                ? this.props.session.location
                : this.props.userRegion
              }
            >
              <Image source={markerImage} style={{ width: 50, height: 50 }} />
            </MapView.Marker>
          </MapView>
        </View>
        <Text style={styles.subTitle}>Report Session</Text>
        <KeyboardAvoidingView behavior="position" contentContainerStyle={styles.reportContainer}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="What happened?"
            placeholderTextColor={Colors.DarkGray}
            onChange={(report) => this.setState({ report })}
            value={this.state.report}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={this.reportSession}
          >
            <Text style={styles.buttonText}>Report</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </ScrollView>
    );
  }
}

SessionDetailsPage.propTypes = {
  session: PropTypes.object.isRequired,
  userRegion: PropTypes.object.isRequired,
  managerView: PropTypes.bool.isRequired,
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  title: {
    marginHorizontal: 15,
    marginBottom: 15,
    fontWeight: '600',
    fontSize: 25,
  },
  subTitle: {
    margin: 15,
    fontWeight: '600',
    fontSize: 20,
  },
  infoContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    minHeight: 210,
    width: '100%',
    paddingHorizontal: 10,
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    paddingVertical: 5,
  },
  mapContainer: {
    width: '100%',
    height: 150,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  textRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  bold: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.Black,
    margin: 10,
  },
  details: {
    fontSize: 16,
    color: Colors.DarkGray,
    marginVertical: 10,
  },
  button: {
    ...CommonStyles.shadow,
    borderRadius: 10,
    width: 100,
    height: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    color: Colors.Primary,
  },
  input: {
    width: '60%',
    minHeight: 30,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.Gray,
    borderRadius: 10,
    backgroundColor: Colors.White,
  },
  reportContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 120,
    width: '100%',
    padding: 10,
    backgroundColor: Colors.LightGray,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
  },
});
