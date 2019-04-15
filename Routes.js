import React, { Component } from 'react';
import {Router, Stack, Scene} from 'react-native-router-flux';

import {Login} from './Login';
import {Signup} from './Signup';
import {Forgot} from './Forgot';
import {Map} from './Map';
import {AccountPage} from './AccountPage';
import {SessionPage} from './SessionPage';
import {RatingPage} from './RatingPage';
import {HistoryPage} from './HistoryPage';
import {SessionModal} from './SessionModal';
import {PaymentPage} from './PaymentPage';
import {ClientPage} from './ClientPage';
import {TrainerPage} from './TrainerPage';
import {OwnerPage} from './OwnerPage';
import {OwnerSignup} from './OwnerSignup';
import {OwnerHistoryPage} from './OwnerHistoryPage';

export class Routes extends Component {
	render() {
		return (
			<Router>
				<Stack key="root" hideNavBar={true}>
					<Scene key="login" component={Login} title="Login"/>
			    	<Scene key="signup" component={Signup} title="Signup"/>
			    	<Scene key="forgot" component={Forgot} title="Forgot" />
			    	<Scene key="map" component={Map} title="Map"/>
			    	<Scene key="account" component={AccountPage} title="AccountPage"/>
			    	<Scene key="session" component={SessionPage} title="SessionPage"/>
			    	<Scene key="rating" component={RatingPage} title="RatingPage" />
			    	<Scene key="history" component={HistoryPage} title="HistoryPage" />
			    	<Scene key="modal" component={SessionModal} title="SessionModal" />
			    	<Scene key="payment" component={PaymentPage} title="PaymentPage" />
			    	<Scene key="clients" component={ClientPage} title="ClientPage" />
			    	<Scene key="trainers" component={TrainerPage} title="TrainerPage" />
			    	<Scene key="owner" component={OwnerPage} title="OwnerPage" />
			    	<Scene key="ownersignup" component={OwnerSignup} title="OwnerSignup" />
			    	<Scene key="ownerhistory" component={OwnerHistoryPage} title="OwnerHistoryPage" />
 			    </Stack>
			</Router>
		);
	}
}
