import React from 'react';
import { Router, Stack, Scene } from 'react-native-router-flux';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPage from './pages/ForgotPage';
import MapPage from './pages/MapPage';
import SettingsPage from './pages/SettingsPage';
import SessionPage from './pages/SessionPage';
import RatingPage from './pages/RatingPage';
import HistoryPage from './pages/HistoryPage';
import CalendarPage from './pages/CalendarPage';
import PaymentPage from './pages/PaymentPage';
import ClientsPage from './pages/ClientsPage';
import TrainersPage from './pages/TrainersPage';
import TrainerPage from './pages/TrainerPage';
import ManagerPage from './pages/ManagerPage';
import ManagerSignupPage from './pages/ManagerSignupPage';
import ManagerHistoryPage from './pages/ManagerHistoryPage';
import GroupSessionPage from './pages/GroupSessionPage';
import GroupSessionRatingPage from './pages/GroupSessionRatingPage';
import GroupSessionDetailsPage from './pages/GroupSessionDetailsPage';
import SessionDetailsPage from './pages/SessionDetailsPage';
import PastGroupSessionDetailsPage from './pages/PastGroupSessionDetailsPage';
import BookingPage from './pages/BookingPage';
import SchedulePage from './pages/SchedulePage';
import CardPage from './pages/CardPage';
import CreateGroupSessionPage from './pages/CreateGroupSessionPage';
import SchedulerPage from './pages/SchedulerPage';
import NutritionPlanPage from './pages/NutritionPlanPage';
import WorkoutPlanPage from './pages/WorkoutPlanPage';
import PlansPage from './pages/PlansPage';
import CreateWorkoutPlanPage from './pages/CreateWorkoutPlanPage';
import CreateNutritionPlanPage from './pages/CreateNutritionPlanPage';

export default function Routes() {
  return (
    <Router>
      <Stack key="root" hideNavBar>
        <Scene key="LoginPage" component={LoginPage} title="LoginPage" />
        <Scene key="SignupPage" component={SignupPage} title="SignupPage" />
        <Scene key="ForgotPage" component={ForgotPage} title="ForgotPage" />
        <Scene key="MapPage" component={MapPage} title="MapPage" />
        <Scene key="SettingsPage" component={SettingsPage} title="SettingsPage" />
        <Scene key="SessionPage" component={SessionPage} title="SessionPage" />
        <Scene key="RatingPage" component={RatingPage} title="RatingPage" />
        <Scene key="HistoryPage" component={HistoryPage} title="HistoryPage" />
        <Scene key="CalendarPage" component={CalendarPage} title="CalendarPage" />
        <Scene key="PaymentPage" component={PaymentPage} title="PaymentPage" />
        <Scene key="ClientsPage" component={ClientsPage} title="ClientsPage" />
        <Scene key="TrainersPage" component={TrainersPage} title="TrainersPage" />
        <Scene key="TrainerPage" component={TrainerPage} title="TrainerPage" />
        <Scene key="ManagerPage" component={ManagerPage} title="ManagerPage" />
        <Scene key="ManagerSignupPage" component={ManagerSignupPage} title="ManagerSignupPage" />
        <Scene key="ManagerHistoryPage" component={ManagerHistoryPage} title="ManagerHistoryPage" />
        <Scene key="GroupSessionPage" component={GroupSessionPage} title="GroupSessionPage" />
        <Scene key="GroupSessionRatingPage" component={GroupSessionRatingPage} title="GroupSessionRatingPage" />
        <Scene key="GroupSessionDetailsPage" component={GroupSessionDetailsPage} title="GroupSessionDetailsPage" />
        <Scene key="SessionDetailsPage" component={SessionDetailsPage} title="SessionDetailsPage" />
        <Scene key="PastGroupSessionDetailsPage" component={PastGroupSessionDetailsPage} title="PastGroupSessionDetailsPage" />
        <Scene key="BookingPage" component={BookingPage} title="BookingPage" />
        <Scene key="SchedulePage" component={SchedulePage} title="SchedulePage" />
        <Scene key="CardPage" component={CardPage} title="CardPage" />
        <Scene key="CreateGroupSessionPage" component={CreateGroupSessionPage} title="CreateGroupSessionPage" />
        <Scene key="SchedulerPage" component={SchedulerPage} title="SchedulerPage" />
        <Scene key="NutritionPlanPage" component={NutritionPlanPage} title="NutritionPlanPage" />
        <Scene key="WorkoutPlanPage" component={WorkoutPlanPage} title="WorkoutPlanPage" />
        <Scene key="PlansPage" component={PlansPage} title="PlansPage" />
        <Scene key="CreateWorkoutPlanPage" component={CreateWorkoutPlanPage} title="CreateWorkoutPlanPage" />
        <Scene key="CreateNutritionPlanPage" component={CreateNutritionPlanPage} title="CreateNutritionPlanPage" />
      </Stack>
    </Router>
  );
}
