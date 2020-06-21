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
  const { email } = body;
  const { password } = body;
  try {
    await firebase.auth().signInWithEmailAndPassword(
      email,
      password,
    );
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    console.log(idToken);
    firebase.auth().signOut();
    send(res, 200, { idToken });
  } catch (error) {
    send(res, 401, 'Unauthorized User');
  }
};

const addGym = async (req, res) => {
  const body = JSON.parse(req.body);
  const latitude = parseFloat(body.latitude);
  const longitude = parseFloat(body.longitude);
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
      longitude,
      latitude,
    },
    address: body.address,
    name: body.name,
    type: body.type,
    website: body.website,
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
    if (body.charge.clientStripe !== userStripe) {
      send(res, 401, 'Unauthorized User');
      return;
    }
  } catch (error) {
    send(res, 401, 'Unauthorized User');
    return;
  }

  stripe.tokens.create(
    {
      customer: body.charge.clientStripe,
    },
    {
      stripe_account: body.charge.trainerStripe,
    },
  ).then((token) => Promise.all(
    [
      token.id,
      stripe.charges.create(
        {
          amount: body.charge.amount,
          currency: body.charge.currency,
          source: token.id,
          description: 'trainNow Session',
          application_fee_amount: body.charge.cut,
        },
        {
          stripe_account: body.charge.trainerStripe,
        },
      ),
    ],
  )).then((results) => {
    send(res, 200, {
      message: 'Success',
      charge: results[1],
    });
  }).catch((error) => {
    console.log(error);
    send(res, 500, { error: error.message });
  });
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

  // Create customer
  stripe.customers.create({
    description: body.uid,
    email: body.email,
    source: body.token.id,
  }).then((customer) => {
    send(res, 200, {
      message: 'Success',
      customer,
    });
  }).catch((error) => {
    console.log(error);
    send(res, 500, { error: error.message });
  });
};

const createTrainer = async (req, res) => {
  const body = JSON.parse(req.body);
  stripe.accounts.create({
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
      id_number: body.token,
      email: body.email,
      phone: body.phone,
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
  }).then((trainer) => {
    send(res, 200, {
      message: 'Success',
      trainer,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.accounts.del(body.stripeId).then((response) => {
    send(res, 200, {
      message: 'Success',
      response,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
};

const createManager = async (req, res) => {
  const body = JSON.parse(req.body);
  stripe.accounts.create({
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
  }).then((trainer) => Promise.all([trainer.id,
    stripe.accounts.createPerson(trainer.id,
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
        id_number: body.ssnToken,
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
      }),
  ])).then((results) => {
    send(res, 200, {
      message: 'Success',
      trainer: results[1],
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.customers.createSource(body.stripeId, {
    source: body.token.id,
  }).then((card) => {
    send(res, 200, {
      message: 'Success',
      card,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.accounts.createExternalAccount(body.stripeId, {
    external_account: body.token.id,
  }).then((card) => {
    send(res, 200, {
      message: 'Success',
      card,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.customers.deleteCard(body.stripeId, body.cardId).then((card) => {
    send(res, 200, {
      message: 'Success',
      card,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, {
      error: err.message,
    });
  });
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

  stripe.accounts.deleteExternalAccount(body.stripeId, body.cardId).then((card) => {
    send(res, 200, {
      message: 'Success',
      card,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.customers.listCards(body.stripeId).then((cards) => {
    send(res, 200, {
      message: 'Success',
      cards,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.accounts.listExternalAccounts(body.stripeId, { object: 'card' }).then((cards) => {
    send(res, 200, {
      message: 'Success',
      cards,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.balance.retrieve({ stripe_account: body.stripeId }).then((balance) => {
    send(res, 200, {
      message: 'Success',
      balance,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.customers.update(body.stripeId, {
    default_source: body.cardId,
  }).then((result) => {
    send(res, 200, {
      message: 'Success',
      result,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  stripe.accounts.updateExternalAccount(body.stripeId, body.cardId, {
    default_for_currency: true,
  }).then((result) => {
    send(res, 200, {
      message: 'Success',
      result,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.message });
  });
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

  twilio.messages.create({
    to: `+1${body.phone}`,
    from: '+18582408311',
    body: body.message,
  }).then((message) => {
    send(res, 200, {
      message: 'Success',
      result: message,
    });
  }).catch((err) => {
    console.log(err);
    send(res, 500, { error: err.mesage });
  });
};

app.use(cors);

app.post('/login', (req, res) => login(req, res));
app.post('/addGym', (req, res) => addGym(req, res));
app.post('/stripe/charge', (req, res) => charge(req, res));
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
