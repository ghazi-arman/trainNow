import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import bugsnag from '@bugsnag/expo';
import { Actions } from 'react-native-router-flux';
import Colors from '../components/Colors';
import {
  loadUser, createNutritionPlan, updateNutritionPlan,
} from '../components/Functions';
import TextField from '../components/TextField';
import BackButton from '../components/BackButton';
import LoadingWheel from '../components/LoadingWheel';
import CommonStyles from '../components/CommonStyles';

export default class CreateNutritionPlanPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      monthly: false,
      submitted: false,
    };
    this.bugsnagClient = bugsnag();
  }

  async componentDidMount() {
    // load user info
    if (!this.state.user) {
      try {
        const user = await loadUser(firebase.auth().currentUser.uid);
        if (this.props.planKey) {
          const plan = user.nutritionPlans[this.props.planKey];
          this.setState({
            user,
            plan,
            name: plan.name,
            description: plan.description,
            duration: plan.duration,
            cost: String(plan.cost),
            monthly: plan.monthly,
            meals: String(plan.meals),
          });
        } else {
          this.setState({ user });
        }
      } catch (error) {
        this.bugsnagClient.notify(error);
        Alert.alert('There was an error loading the page.');
        Actions.PlansPage();
      }
    }
  }

  createPlan = async () => {
    try {
      if (!this.state.name) {
        Alert.alert('Please enter a plan name');
        return;
      }
      if (!this.state.description) {
        Alert.alert('Please enter a plan description');
        return;
      }
      if (!this.state.duration) {
        Alert.alert('Please enter a plan duration.');
        return;
      }
      if (!this.state.cost || parseInt(this.state.cost, 10) < 5) {
        Alert.alert('Please enter a cost greater than $5.');
        return;
      }
      if (!this.state.meals || parseInt(this.state.meals, 10) < 0) {
        Alert.alert('Please enter a meal amount greater than 0.');
        return;
      }
      if (this.state.submitted) {
        return;
      }
      this.setState({ submitted: true });
      await createNutritionPlan(
        firebase.auth().currentUser.uid,
        this.state.name,
        this.state.description,
        this.state.duration,
        this.state.monthly,
        Number(this.state.cost),
        Number(this.state.meals),
      );
      Alert.alert('Plan successfully created.');
      Actions.PlansPage();
    } catch (error) {
      Alert.alert('There was an error when trying to create the plan.');
    } finally {
      this.setState({ submitted: false });
    }
  }

  updatePlan = async () => {
    try {
      if (this.state.plan && this.state.plan.monthly !== this.state.monthly) {
        Alert.alert('You cannot change a non monthly plan to monthly or vice versa. Create a new plan in order to do so.');
        return;
      }
      if (!this.state.name) {
        Alert.alert('Please enter a plan name');
        return;
      }
      if (!this.state.description) {
        Alert.alert('Please enter a plan description');
        return;
      }
      if (!this.state.duration) {
        Alert.alert('Please enter a plan duration.');
        return;
      }
      if (!this.state.cost || parseInt(this.state.cost, 10) < 5) {
        Alert.alert('Please enter a cost greater than $5.');
        return;
      }
      if (!this.state.meals || parseInt(this.state.meals, 10) < 0) {
        Alert.alert('Please enter a meal amount greater than 0.');
        return;
      }
      if (this.state.submitted) {
        return;
      }
      this.setState({ submitted: true });
      await updateNutritionPlan(
        firebase.auth().currentUser.uid,
        this.props.planKey,
        this.state.name,
        this.state.description,
        this.state.duration,
        this.state.monthly,
        Number(this.state.cost),
        Number(this.state.meals),
      );
      Alert.alert('Session successfully updated. If there was a price change the current users will be grandfathered into the plan');
      Actions.PlansPage();
    } catch (error) {
      Alert.alert('There was an error when trying to update the session.');
    } finally {
      this.setState({ submitted: false });
    }
  }

  render() {
    if (!this.state.user || this.state.submitted) {
      return <LoadingWheel />;
    }
    let button;
    if (this.props.planKey) {
      button = (
        <TouchableOpacity
          style={CommonStyles.fullButton}
          onPress={this.updatePlan}
        >
          <Text style={CommonStyles.buttonText}>Update Plan</Text>
        </TouchableOpacity>
      );
    } else {
      button = (
        <TouchableOpacity
          style={CommonStyles.fullButton}
          onPress={this.createPlan}
        >
          <Text style={CommonStyles.buttonText}>Create Plan</Text>
        </TouchableOpacity>
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.center} style={{ width: '100%' }}>
          <BackButton style={{ marginHorizontal: 5 }} />
          <TextField
            icon="vcard"
            placeholder="Plan Name"
            onChange={(name) => this.setState({ name })}
            value={this.state.name}
          />
          <TextField
            icon="info"
            multiline
            placeholder="Plan description"
            onChange={(description) => this.setState({ description })}
            value={this.state.description}
          />
          <TextField
            icon="clock-o"
            placeholder="Duration (weeks)"
            keyboard="number-pad"
            onChange={(duration) => this.setState({ duration })}
            value={this.state.duration}
          />
          <TextField
            icon="hashtag"
            placeholder="Unique meals in plan"
            keyboard="number-pad"
            onChange={(meals) => this.setState({ meals })}
            value={this.state.meals}
          />
          <TextField
            icon="dollar"
            placeholder="Cost"
            keyboard="number-pad"
            onChange={(cost) => this.setState({ cost })}
            value={this.state.cost}
          />
          <Text style={styles.formLabel}>Monthly charge?</Text>
          <Switch
            trackColor={Colors.Primary}
            _thumbColor={Colors.Secondary}
            value={this.state.monthly}
            onValueChange={(monthly) => this.setState({ monthly })}
          />
          <View style={styles.buttonContainer}>
            {button}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
}

CreateNutritionPlanPage.propTypes = {
  planKey: PropTypes.string,
};

CreateNutritionPlanPage.defaultProps = {
  planKey: null,
};

const styles = StyleSheet.create({
  formContainer: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  center: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: Colors.Primary,
    paddingBottom: 10,
    margin: 5,
  },
});
