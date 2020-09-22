import React, { Component } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Actions } from 'react-native-router-flux';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { FontAwesome } from '@expo/vector-icons';
import { deletePlan, loadUser, cancelPlan } from '../components/Functions';
import Colors from '../components/Colors';
import Constants from '../components/Constants';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class PlansPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'pending',
      submitted: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    if (!this.state.user) {
      try {
        const userId = firebase.auth().currentUser.uid;
        const user = await loadUser(userId);
        this.setState({ user });
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was as an error loading the plans page.');
        Actions.reset('MapPage');
      }
    }
  }

  deleteNutritionPlan = async (plan) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan? If monthly, all monthly payments will be stopped.',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            if (this.state.submitted) {
              return;
            }
            this.setState({ submitted: true });
            try {
              let user = await loadUser(firebase.auth().currentUser.uid);
              user.nutritionPlans[plan.key].key = plan.key;
              await deletePlan(firebase.auth().currentUser.uid, user.nutritionPlans[plan.key], 'nutrition');
              user = await loadUser(firebase.auth().currentUser.uid);
              this.setState({ user });
            } catch (error) {
              Alert.alert('There was an error when trying to delete the plan');
            } finally {
              this.setState({ submitted: false });
            }
          },
        },
      ],
    );
  }

  cancelNutritionPlan = async (plan) => {
    Alert.alert(
      'Cancel Plan',
      'Are you sure you want to cancel this plan?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            if (this.state.submitted) {
              return;
            }
            this.setState({ submitted: true });
            try {
              let user = await loadUser(firebase.auth().currentUser.uid);
              user.nutritionPlans[plan.key].key = plan.key;
              await cancelPlan(firebase.auth().currentUser.uid, user.nutritionPlans[plan.key], 'nutrition');
              user = await loadUser(firebase.auth().currentUser.uid);
              this.setState({ user });
            } catch (error) {
              Alert.alert('There was an error when trying to cancel the plan');
            } finally {
              this.setState({ submitted: false });
            }
          },
        },
      ],
    );
  }

  deleteWorkoutPlan = async (plan) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan? If monthly, all monthly payments will be stopped.',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            if (this.state.submitted) {
              return;
            }
            this.setState({ submitted: true });
            try {
              let user = await loadUser(firebase.auth().currentUser.uid);
              user.workoutPlans[plan.key].key = plan.key;
              await deletePlan(firebase.auth().currentUser.uid, user.workoutPlans[plan.key], 'workout');
              user = await loadUser(firebase.auth().currentUser.uid);
              this.setState({ user });
            } catch (error) {
              Alert.alert('There was an error when trying to delete the plan');
            } finally {
              this.setState({ submitted: false });
            }
          },
        },
      ],
    );
  }

  cancelWorkoutPlan = async (plan) => {
    Alert.alert(
      'Cancel Plan',
      'Are you sure you want to cancel this plan?',
      [
        { text: 'No' },
        {
          text: 'Yes',
          onPress: async () => {
            if (this.state.submitted) {
              return;
            }
            this.setState({ submitted: true });
            try {
              let user = await loadUser(firebase.auth().currentUser.uid);
              user.workoutPlans[plan.key].key = plan.key;
              await cancelPlan(firebase.auth().currentUser.uid, user.workoutPlans[plan.key], 'workout');
              user = await loadUser(firebase.auth().currentUser.uid);
              this.setState({ user });
            } catch (error) {
              Alert.alert('There was an error when trying to cancel the plan');
            } finally {
              this.setState({ submitted: false });
            }
          },
        },
      ],
    );
  }

  renderWorkoutPlans = () => {
    if (!this.state.user.workoutPlans) {
      return (
        <Text style={styles.noneText}>None Created</Text>
      );
    }
    return Object.keys(this.state.user.workoutPlans).map((key) => {
      const plan = this.state.user.workoutPlans[key];
      plan.key = key;
      let buttons;
      if (this.state.user.type === Constants.trainerType) {
        buttons = ([
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.deleteWorkoutPlan(plan)}
            key={0}
          >
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Delete</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            style={styles.button}
            onPress={() => Actions.CreateWorkoutPlanPage({ planKey: key })}
            key={1}
          >
            <Text style={[styles.buttonText, { color: Colors.Green }]}>Edit</Text>
          </TouchableOpacity>,
        ]);
      } else if (plan.monthly) {
        buttons = (
          <TouchableOpacity style={styles.button} onPress={() => this.cancelWorkoutPlan(plan)}>
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Cancel</Text>
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.planContainer} key={key}>
          <View style={styles.planInfo}>
            <Text style={styles.name}>{plan.name}</Text>
            <Text style={styles.details}>
              {(plan.description).substring(0, 10)}
              ...
            </Text>
            <Text style={styles.details}>
              {plan.duration}
              {' '}
              weeks
            </Text>
            <Text style={styles.details}>
              $
              {plan.cost}
              {plan.monthly ? '/month' : null}
            </Text>
          </View>
          <View style={styles.buttonColumn}>
            {buttons}
          </View>
        </View>
      );
    });
  }

  renderNutritionPlans = () => {
    if (!this.state.user.nutritionPlans) {
      return (
        <Text style={styles.noneText}>None Created</Text>
      );
    }
    return Object.keys(this.state.user.nutritionPlans).map((key) => {
      const plan = this.state.user.nutritionPlans[key];
      plan.key = key;
      let buttons;
      if (this.state.user.type === Constants.trainerType) {
        buttons = ([
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.deleteNutritionPlan(plan)}
            key={0}
          >
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Delete</Text>
          </TouchableOpacity>,
          <TouchableOpacity
            style={styles.button}
            onPress={() => Actions.CreateNutritionPlanPage({ planKey: key })}
            key={1}
          >
            <Text style={[styles.buttonText, { color: Colors.Green }]}>Edit</Text>
          </TouchableOpacity>,
        ]);
      } else if (plan.monthly) {
        buttons = (
          <TouchableOpacity style={styles.button} onPress={() => this.cancelNutritionPlan(plan)}>
            <Text style={[styles.buttonText, { color: Colors.Red }]}>Cancel</Text>
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.planContainer} key={key}>
          <View style={styles.planInfo}>
            <Text style={styles.name}>{plan.name}</Text>
            <Text style={styles.details}>
              {(plan.description).substring(0, 10)}
              ...
            </Text>
            <Text style={styles.details}>
              {plan.duration}
              {' '}
              weeks
            </Text>
            <Text style={styles.details}>
              $
              {plan.cost}
              {plan.monthly ? '/month' : null}
            </Text>
          </View>
          <View style={styles.buttonColumn}>
            {buttons}
          </View>
        </View>
      );
    });
  }

  render() {
    if (!this.state.user || this.state.submitted) {
      return <LoadingWheel />;
    }
    return (
      <View style={CommonStyles.flexStartContainer}>
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={styles.container}
        >
          <BackButton onPress={Actions.MapPage} />
          <Text style={styles.title}>Plans</Text>
          {this.state.user.type === Constants.trainerType
            ? (
              <View style={styles.buttonRow}>
                <View style={styles.buttonBox}>
                  <TouchableOpacity style={styles.center} onPress={Actions.CreateWorkoutPlanPage}>
                    <FontAwesome style={styles.icon} name="plus" color={Colors.Primary} size={30} />
                    <Text>Workout Plan</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonBox}>
                  <TouchableOpacity style={styles.center} onPress={Actions.CreateNutritionPlanPage}>
                    <FontAwesome style={styles.icon} name="plus" color={Colors.Primary} size={30} />
                    <Text>Nutrition Plan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
            : null}
          <Text style={styles.subTitle}>Workout Plans</Text>
          {this.renderWorkoutPlans()}
          <Text style={styles.subTitle}>Nutrition Plans</Text>
          {this.renderNutritionPlans()}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  planContainer: {
    minHeight: 150,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 20,
    backgroundColor: Colors.LightGray,
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
    marginBottom: 10,
  },
  planInfo: {
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginHorizontal: 10,
  },
  buttonColumn: {
    ...CommonStyles.shadow,
    height: '100%',
    position: 'absolute',
    right: 15,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileImage: {
    height: 50,
    width: 50,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  details: {
    fontSize: 15,
    color: Colors.DarkGray,
    marginBottom: 5,
  },
  title: {
    fontSize: 30,
    color: Colors.Black,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 15,
    marginBottom: 5,
  },
  subTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: Colors.Black,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  noneText: {
    fontSize: 18,
    margin: 10,
    marginHorizontal: 15,
  },
  button: {
    ...CommonStyles.shadow,
    borderRadius: 10,
    width: 100,
    height: 30,
    backgroundColor: Colors.White,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: Colors.Black,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonRow: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.LightGray,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.Gray,
  },
  buttonBox: {
    width: '33%',
    height: '90%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
  },
});
