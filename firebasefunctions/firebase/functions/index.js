const functions = require('firebase-functions');
const express = require('express');
const admin = require('firebase-admin');
const firebase = require('firebase');
const cors = require('cors')({ origin: true });
const stripe = require('stripe')(functions.config().stripe.token);
const twilio = require('twilio')(functions.config().twilio.id, functions.config().twilio.auth);

const app = express();
admin.initializeApp(functions.config().firebase);
firebase.initializeApp({
  apiKey: functions.config().fb.api_key,
  authDomain: functions.config().fb.auth_domain,
  databaseURL: functions.config().fb.db_url,
  projectId: functions.config().fb.project_id,
  storageBucket: functions.config().fb.storage_bucket,
  messagingSenderId: functions.config().fb.messaging_sender_id,
});

const send = (res, code, body) => {
  res.status(code).send({
    headers: { 'Access-Control-Allow-Origin': '*' },
    body,
  });
};

const login = async (req, res) => {
  const body = JSON.parse(req.body);
  const { email, password } = body;
  try {
    await firebase.auth().signInWithEmailAndPassword(
      email,
      password,
    );
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    firebase.auth().signOut();
    send(res, 200, { idToken });
  } catch (error) {
    send(res, 401, 'Unauthorized User');
  }
};

const addGym = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let adminStatus = await admin.database().ref(`/users/${uid}/admin`).once('value');
    adminStatus = adminStatus.val();
    if (!adminStatus) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  const gym = {
    hours: body.hours,
    location: {
      longitude: parseFloat(body.latitude),
      latitude: parseFloat(body.latitude),
    },
    address: body.address,
    name: body.name,
    type: body.type,
    website: body.website,
    virtual: body.virtual ? body.virtual : false,
  };

  try {
    await admin.database().ref('gyms').push(gym);
    send(res, 200, { gym });
  } catch (error) {
    console.log(error);
    send(res, 500, { error, gym });
  }
};

const charge = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (body.clientStripe !== userStripe) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const token = await stripe.tokens.create(
      {
        customer: body.clientStripe,
      },
      {
        stripe_account: body.trainerStripe,
      },
    );
    const result = await stripe.charges.create(
      {
        amount: body.amount,
        currency: body.currency,
        source: token.id,
        description: 'TrainNow Session',
        application_fee_amount: body.cut,
      },
      {
        stripe_account: body.trainerStripe,
      },
    );
    send(res, 200, { message: 'Success', charge: result });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const createProduct = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (body.stripeId !== userStripe) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const product = await stripe.products.create({
      id: body.productId,
      name: body.productName,
    });
    send(res, 200, {
      message: 'Success',
      product,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  const body = JSON.parse(req.body);

  try {
    const product = await stripe.products.del(body.productId);
    send(res, 200, {
      message: 'Success',
      product,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const createSubscription = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (body.clientStripe !== userStripe) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: body.clientStripe,
      items: [
        {
          price_data: {
            currency: body.currency,
            product: body.productId,
            recurring: {
              interval: body.interval,
            },
            unit_amount: body.amount,
          },
        },
      ],
      application_fee_percent: body.percentage,
      transfer_data: {
        destination: body.trainerStripe,
      },
    });
    send(res, 200, {
      message: 'Success',
      subscription,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const cancelSubscription = async (req, res) => {
  const body = JSON.parse(req.body);

  try {
    const subscription = await stripe.subscriptions.del(body.subscriptionId);
    send(res, 200, {
      message: 'Success',
      subscription,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const createCustomer = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    if (uid !== body.uid) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const customer = await stripe.customers.create({
      description: body.uid,
      email: body.email,
      source: body.token.id,
    });
    send(res, 200, {
      message: 'Success',
      customer,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const createTrainer = async (req, res) => {
  const body = JSON.parse(req.body);
  try {
    const trainer = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      email: body.email,
      requested_capabilities: ['card_payments', 'transfers'],
      business_type: 'individual',
      business_profile: {
        product_description: 'Personal Trainer who sells his services to clients.',
        mcc: 7298,
      },
      individual: {
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        ssn_last_4: body.ssn,
        dob: {
          day: body.day,
          month: body.month,
          year: body.year,
        },
        address: {
          line1: body.line1,
          city: body.city,
          postal_code: body.zip,
          state: body.state,
          country: 'US',
        },
      },
      tos_acceptance: {
        date: new Date(),
        ip: req.ip,
      },
    });
    send(res, 200, {
      message: 'Success',
      trainer,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const deleteTrainer = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const response = await stripe.accounts.del(body.stripeId);
    send(res, 200, {
      message: 'Success',
      response,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const createManager = async (req, res) => {
  const body = JSON.parse(req.body);
  try {
    const trainer = await stripe.accounts.create({
      type: 'custom',
      country: 'US',
      email: body.email,
      requested_capabilities: ['card_payments', 'transfers'],
      business_type: 'company',
      business_profile: {
        product_description: 'Gym',
        mcc: 7298,
      },
      company: {
        name: body.company,
        tax_id: body.taxToken,
        phone: body.phone,
        address: {
          line1: body.line1,
          city: body.city,
          postal_code: body.zip,
          state: body.state,
          country: 'US',
        },
      },
      tos_acceptance: {
        date: new Date(),
        ip: req.ip,
      },
    });
    const results = await stripe.accounts.createPerson(trainer.id,
      {
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        relationship: {
          owner: true,
          account_opener: true,
          title: 'Owner',
        },
        ssn_last_4: body.ssn,
        dob: {
          day: body.day,
          month: body.month,
          year: body.year,
        },
        address: {
          line1: body.line1,
          city: body.city,
          postal_code: body.zip,
          state: body.state,
        },
      });
    send(res, 200, {
      message: 'Success',
      trainer: results,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const addCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const card = await stripe.customers.createSource(body.stripeId, {
      source: body.token.id,
    });
    send(res, 200, {
      message: 'Success',
      card,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const addTrainerCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const card = await stripe.accounts.createExternalAccount(body.stripeId, {
      external_account: body.token.id,
    });
    send(res, 200, {
      message: 'Success',
      card,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const deleteCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const card = await stripe.customers.deleteCard(body.stripeId, body.cardId);
    send(res, 200, {
      message: 'Success',
      card,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, {
      error: error.message,
    });
  }
};

const deleteTrainerCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const card = await stripe.accounts.deleteExternalAccount(body.stripeId, body.cardId);
    send(res, 200, {
      message: 'Success',
      card,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const listCards = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const cards = await stripe.customers.listCards(body.stripeId);
    send(res, 200, {
      message: 'Success',
      cards,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const listTrainerCards = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const cards = await stripe.accounts.listExternalAccounts(body.stripeId, { object: 'card' });
    send(res, 200, {
      message: 'Success',
      cards,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const getBalance = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const balance = await stripe.balance.retrieve({ stripe_account: body.stripeId });
    send(res, 200, {
      message: 'Success',
      balance,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const setDefaultCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const result = stripe.customers.update(body.stripeId, {
      default_source: body.cardId,
    });
    send(res, 200, {
      message: 'Success',
      result,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const setDefaultTrainerCard = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
    userStripe = userStripe.val();
    if (userStripe !== body.stripeId) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const result = await stripe.accounts.updateExternalAccount(body.stripeId, body.cardId, {
      default_for_currency: true,
    });
    send(res, 200, {
      message: 'Success',
      result,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.message });
  }
};

const sendMessage = async (req, res) => {
  const body = JSON.parse(req.body);
  const idToken = req.headers.authorization;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    if (uid !== body.uid) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  try {
    const message = await twilio.messages.create({
      to: `+1${body.phone}`,
      from: '+18582408311',
      body: body.message,
    });
    send(res, 200, {
      message: 'Success',
      result: message,
    });
  } catch (error) {
    console.log(error);
    send(res, 500, { error: error.mesage });
  }
};

app.use(cors);

app.post('/login', (req, res) => login(req, res));
app.post('/addGym', (req, res) => addGym(req, res));
app.post('/stripe/charge', (req, res) => charge(req, res));
app.post('/stripe/createProduct', (req, res) => createProduct(req, res));
app.post('/stripe/deleteProduct', (req, res) => deleteProduct(req, res));
app.post('/stripe/createSubscription', (req, res) => createSubscription(req, res));
app.post('/stripe/cancelSubscription', (req, res) => cancelSubscription(req, res));
app.post('/stripe/createCustomer', (req, res) => createCustomer(req, res));
app.post('/stripe/setDefaultCard', (req, res) => setDefaultCard(req, res));
app.post('/stripe/setDefaultTrainerCard', (req, res) => setDefaultTrainerCard(req, res));
app.post('/stripe/addCard', (req, res) => addCard(req, res));
app.post('/stripe/addTrainerCard', (req, res) => addTrainerCard(req, res));
app.post('/stripe/deleteCard', (req, res) => deleteCard(req, res));
app.post('/stripe/deleteTrainerCard', (req, res) => deleteTrainerCard(req, res));
app.post('/stripe/listCards', (req, res) => listCards(req, res));
app.post('/stripe/listTrainerCards', (req, res) => listTrainerCards(req, res));
app.post('/stripe/createTrainer', (req, res) => createTrainer(req, res));
app.post('/stripe/deleteTrainer', (req, res) => deleteTrainer(req, res));
app.post('/stripe/createManager', (req, res) => createManager(req, res));
app.post('/stripe/getBalance', (req, res) => getBalance(req, res));
app.post('/twilio/sendMessage', (req, res) => sendMessage(req, res));

exports.fb = functions.https.onRequest(app);
