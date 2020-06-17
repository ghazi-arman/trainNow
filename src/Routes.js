import React, { Component } from 'react';
import {Router, Stack, Scene} from 'react-native-router-flux';

import {LoginPage} from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import {ForgotPage} from './pages/ForgotPage';
import {MapPage} from './pages/MapPage';
import SettingsPage from './pages/SettingsPage';
import {SessionPage} from './pages/SessionPage';
import {RatingPage} from './pages/RatingPage';
import {HistoryPage} from './pages/HistoryPage';
import {CalendarPage} from './pages/CalendarPage';
import {PaymentPage} from './pages/PaymentPage';
import {ClientPage} from './pages/ClientPage';
import TrainerPage from './pages/TrainerPage';
import {ManagerPage} from './pages/ManagerPage';
import {ManagerSignupPage} from './pages/ManagerSignupPage';
import {ManagerHistoryPage} from './pages/ManagerHistoryPage';
import {GroupSessionPage} from './pages/GroupSessionPage';
import {GroupSessionRatingPage} from './pages/GroupSessionRatingPage';

export class Routes extends Component {
  render() {
    return (
      <Router>
        <Stack key="root" hideNavBar={true}>
          <Scene key="LoginPage" component={LoginPage} title="LoginPage" />
            <Scene key="SignupPage" component={SignupPage} title="SignupPage" />
            <Scene key="ForgotPage" component={ForgotPage} title="ForgotPage"  />
            <Scene key="MapPage" component={MapPage} title="MapPage" />
            <Scene key="SettingsPage" component={SettingsPage} title="SettingsPage" />
            <Scene key="SessionPage" component={SessionPage} title="SessionPage" />
            <Scene key="RatingPage" component={RatingPage} title="RatingPage" />
            <Scene key="HistoryPage" component={HistoryPage} title="HistoryPage" />
            <Scene key="CalendarPage" component={CalendarPage} title="CalendarPage" />
            <Scene key="PaymentPage" component={PaymentPage} title="PaymentPage" />
            <Scene key="ClientPage" component={ClientPage} title="ClientPage" />
            <Scene key="TrainerPage" component={TrainerPage} title="TrainerPage" />
            <Scene key="ManagerPage" component={ManagerPage} title="ManagerPage" />
            <Scene key="ManagerSignupPage" component={ManagerSignupPage} title="ManagerSignupPage" />
            <Scene key="ManagerHistoryPage" component={ManagerHistoryPage} title="ManagerHistoryPage" />
            <Scene key="GroupSessionPage" component={GroupSessionPage} title="GroupSessionPage" />
            <Scene key="GroupSessionRatingPage" component={GroupSessionRatingPage} title="GroupSessionRatingPage" />
           </Stack>
      </Router>
    );
  }
}
