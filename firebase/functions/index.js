const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();

// TODO: Remember to set token using >> firebase functions:config:set stripe.token="SECRET_STRIPE_TOKEN_HERE"
const stripe = require('stripe')(functions.config().stripe.token);

function charge(req, res) {
    const body = JSON.parse(req.body);
    const traineeStripe = body.charge.traineeId;
    const trainerStripe = body.charge.trainerId;
    const amount = body.charge.amount;
    const cut = body.charge.cut;
    const currency = body.charge.currency;

    //Create token and charge
    stripe.tokens.create({ customer: traineeStripe}, {stripe_account: trainerStripe }).then(token => {
        return Promise.all([token.id,
            stripe.charges.create({
                amount: amount,
                currency: currency,
                source: token.id, 
                description: 'trainNow Session',
                application_fee_amount: cut,
            }, {stripe_account: trainerStripe})
        ]);
    }).then(results => {
        send(res, 200, {
            message: 'Success',
            charge: results[1]
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, { error: err.message });
    });
}

function createCustomer(req, res) {
    const body = JSON.parse(req.body);
    const id = body.id;
    const email = body.email;
    const token = body.token.id;

    //Create customer
    stripe.customers.create({
        description: id,
        email: email,
        source: token,
    }).then(customer => {
        send(res, 200, {
            message: 'Success',
            customer: customer,
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function createTrainer(req, res) {
    const body = JSON.parse(req.body);
    const email = body.email;
    const id = body.id;

    //Create connected account
    stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: email,
        description: id,
    }).then(trainer => {
        send(res, 200, {
            message: 'Success',
            trainer: trainer,
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function addCard(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    const token = body.token.id;

    //Add Card to Customer
    stripe.customers.createSource(stripeid, {
        source: token
    }).then(card => {
        send(res, 200, {
            message: 'Success',
            card: card,
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function deleteCard(req, res){
    const body = JSON.parse(req.body);
    const cardId = body.cardId;
    const stripeId = body.stripeId;

    //Remove card from customer
    stripe.customers.deleteCard(stripeId, cardId).then(card => {
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

function listCards(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    stripe.customers.listCards(stripeid).then(cards => {
        send(res, 200, {
            message: 'Success',
            cards: cards
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function send(res, code, body) {
    res.send({
        statusCode: code,
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify(body),
    });
}

app.use(cors);
app.post('/charge', (req, res) => {
    // Catch any unexpected errors to prevent crashing
    try {
        charge(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: e
        });
    }
});

app.post('/createCustomer', (req, res) => {
    // Catch any unexpected errors to prevent crashing
    try {
        createCustomer(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: e
        });
    }
});

app.post('/addCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        addCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
});

app.post('/deleteCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        deleteCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
});

app.post('/listCards', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        listCards(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }   
});

app.post('/createTrainer', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        createTrainer(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }   
});

exports.stripe = functions.https.onRequest(app);