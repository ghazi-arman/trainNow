const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// TODO: Remember to set token using >> firebase functions:config:set stripe.token="SECRET_STRIPE_TOKEN_HERE"
const stripe = require('stripe')(functions.config().stripe.token);
const twilio = require('twilio')(functions.config().twilio.id, functions.config().twilio.auth);

function addGym(req, res) {
    const body = JSON.parse(req.body);
    const latitude = parseFloat(body.latitude);
    const longitude = parseFloat(body.longitude);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let adminStatus = await admin.database().ref(`/users/${uid}/admin`).once('value');
        adminStatus = adminStatus.val();
        if(!adminStatus) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    const gym = {
        hours: body.hours,
        location: {
            longitude,
            latitude
        },
        name: body.name,
        type: body.type
    }
    
    if(body.type === 'owner'){
        gym.ownerKey = body.ownerKey;
    }

    admin.database().ref('gyms').push(gym).then(result => {
        send(res, 200, { message: 'Gym added' });
    }).catch(error => {
        send(res, 500, { error: error.message });
    });
}

function charge(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.charge.traineeStripe !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    //Create token and charge
    stripe.tokens.create({ customer: body.charge.traineeStripe}, {stripe_account: body.charge.trainerStripe }).then(token => {
        return Promise.all([token.id,
            stripe.charges.create({
                amount: body.charge.amount,
                currency: body.charge.currency,
                source: token.id, 
                description: 'trainNow Session',
                application_fee_amount: body.charge.cut,
            }, {stripe_account: body.charge.trainerStripe})
        ]);
    }).then(results => {
        send(res, 200, {
            message: 'Success',
            charge: results[1]
        });
        return;
    }).catch(error => {
        console.log(error);
        send(res, 500, { error: error.message });
        return;
    });
}

function createCustomer(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;

    let isValid = true;
    admin.auth().verifyIdToken(idToken).then(decodedToken => {
        let uid = decodedToken.uid;
        if(uid !== body.id){
            isValid = false;
        }
        return;
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    //Create customer
    stripe.customers.create({
        description: body.id,
        email: body.email,
        source: body.token.id,
    }).then(customer => {
        send(res, 200, {
            message: 'Success',
            customer: customer,
        });
        return;
    }).catch(error => {
        console.log(error);
        send(res, 500, { error: error.message });
        return;
    });
}

function createTrainer(req, res) {
    const body = JSON.parse(req.body);
    stripe.accounts.create({ 
        type: 'custom',
        country: 'US',
        email: body.email,
        requested_capabilities: ['card_payments', 'transfers'],
        business_type: 'individual',
        business_profile: {
            product_description: 'Personal Trainer who sells his services to clients.',
            mcc: 7298
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
                year: body.year
            },
            address: {
                line1: body.line1,
                city: body.city,
                postal_code: body.zip,
                state: body.state,
                country: bodycountry,
            }
        },
        tos_acceptance: {
            date: new Date(),
            ip: req.ip,
        }
    }).then(trainer => {
        send(res, 200, {
            message: 'Success',
            trainer: trainer
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
        return;
    });
}

function createOwner(req, res) {
    const body = JSON.parse(req.body);
    stripe.accounts.create({ 
        type: 'custom',
        country: 'US',
        email: body.email,
        requested_capabilities: ['card_payments', 'transfers'],
        business_type: 'company',
        business_profile: {
            product_description: 'Gym',
            mcc: 7298
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
                country: body.country,
            }
        },
        tos_acceptance: {
            date: new Date(),
            ip: req.ip,
        }
    }).then(trainer => {
        return Promise.all([trainer.id,
            stripe.accounts.createPerson(trainer.id, 
            {
                first_name: body.firstName,
                last_name: body.lastName,
                email: body.email,
                phone: body.phone,
                relationship: {
                    owner: true,
                    account_opener: true,
                    title: 'Owner'
                },
                id_number: body.ssnToken,
                dob: {
                    day: body.day,
                    month: body.month,
                    year: body.year
                },
                address: {
                    line1: body.line1,
                    city: body.city,
                    postal_code: body.zip,
                    state: body.state,
                },
            })
        ]);
    }).then(results => {
        send(res, 200, {
            message: 'Success',
            trainer: results[1]
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
        return;
    });
}

function addCard(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    //Add Card to Customer
    stripe.customers.createSource(body.stripeId, {
        source: body.token.id
    }).then(card => {
        send(res, 200, {
            message: 'Success',
            card: card,
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
        return;
    });
}

function addTrainerCard(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;

    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }

    let isValid = true;
    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    //Add Card to Customer
    stripe.accounts.createExternalAccount(body.stripeId, {
        external_account: body.token.id
    }).then(card => {
        send(res, 200, {
            message: 'Success',
            card: card,
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function deleteCard(req, res){
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User');
        return;
    }

    //Remove card from customer
    stripe.customers.deleteCard(body.stripeId, body.cardId).then(card => {
        send(res, 200, {
            message: 'Success',
            card: card
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function deleteTrainerCard(req, res){
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    //Remove card from customer
    stripe.accounts.deleteExternalAccount(stripeId, cardId).then(card => {
        send(res, 200, {
            message: 'Success',
            card: card
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function listCards(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
        return;
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    stripe.customers.listCards(body.stripeId).then(cards => {
        send(res, 200, {
            message: 'Success',
            cards: cards
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function listTrainerCards(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    stripe.accounts.listExternalAccounts(body.stripeId, {object: 'card'}).then(cards => {
        send(res, 200, {
            message: 'Success',
            cards: cards
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function getBalance(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    stripe.balance.retrieve({ stripe_account: body.stripeId }).then(balance => {
        send(res, 200, {
            message: 'Success',
            balance: balance
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function setDefaultCard(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    stripe.customers.update(body.stripeId, {
        default_source: body.cardId
    }).then(result => {
        send(res, 200, {
            message: 'Success',
            result: result
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function setDefaultTrainerCard(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(body.stripeId !== userStripe) {
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    stripe.accounts.updateExternalAccount(body.stripeId, body.cardId, {
        default_for_currency: true
    }).then(result => {
        send(res, 200, {
            message: 'Success',
            result: result
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function sendMessage(req, res) {
    const body = JSON.parse(req.body);
    const idToken = req.headers.authorization;
    let isValid = true;

    admin.auth().verifyIdToken(idToken).then(decodedToken => {
        let uid = decodedToken.uid;
        if(uid !== body.user){
            isValid = false;
        }
    }).catch(error => isValid = false);

    if(!isValid){
        send(res, 401, 'Unauthorized User.');
        return;
    }

    twilio.messages.create({
        to: `+1${body.phone}`,
        from: '+18582408311',
        body: body.message
    }).then(message => {
        send(res, 200, {
            message: 'Success',
            result: message
        });
        return
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.mesage });
    });
}

function send(res, code, body) {
    res.status(code).send({
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify(body),
    });
}

app.use(cors);

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
app.post('/stripe/createOwner', (req, res) => createOwner(req, res));
app.post('/stripe/getBalance', (req, res) => getBalance(req, res));
app.post('/twilio/sendMessage', (req, res) => sendMessage(req, res));

exports.fb = functions.https.onRequest(app);