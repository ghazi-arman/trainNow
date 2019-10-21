const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
const express = require('express');
const cors = require('cors')({origin: true});
const app = express();

// TODO: Remember to set token using >> firebase functions:config:set stripe.token="SECRET_STRIPE_TOKEN_HERE"
const stripe = require('stripe')(functions.config().stripe.token);
const twilio = require('twilio')(functions.config().twilio.id, functions.config().twilio.auth);

function charge(req, res) {
    const body = JSON.parse(req.body);
    const traineeStripe = body.charge.traineeId;
    const trainerStripe = body.charge.trainerId;
    const amount = body.charge.amount;
    const cut = body.charge.cut;
    const currency = body.charge.currency;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(traineeStripe !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

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
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(decodedToken => {
            let uid = decodedToken.uid;
            if(uid !== id){
                isValid = false;
                send(res, 401, 'Unauthorized User');
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

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
    const phone = body.phone;
    const lastName = body.lastName;
    const firstName = body.firstName;
    const token = body.token;
    const day = body.day;
    const month = body.month;
    const year = body.year;
    const line1 = body.line1;
    const city = body.city;
    const zip = body.zip;
    const state = body.state;
    const country = body.country;

    //Create token and charge
    stripe.accounts.create({ 
        type: 'custom',
        country: 'US',
        email: email,
        requested_capabilities: ['card_payments', 'transfers'],
        business_type: 'individual',
        business_profile: {
            product_description: 'Personal Trainer who sells his services to clients.',
            mcc: 7298
        },
        individual: {
            first_name: firstName,
            last_name: lastName,
            id_number: token,
            email: email,
            phone: phone,
            dob: {
                day: day,
                month: month,
                year: year
            },
            address: {
                line1: line1,
                city: city,
                postal_code: zip,
                state: state,
                country: country,
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
    });
}

function createOwner(req, res) {
    const body = JSON.parse(req.body);
    const email = body.email;
    const phone = body.phone;
    const lastName = body.lastName;
    const firstName = body.firstName;
    const company = body.company;
    const ssnToken = body.ssnToken;
    const taxToken = body.taxToken;
    const day = body.day;
    const month = body.month;
    const year = body.year;
    const line1 = body.line1;
    const city = body.city;
    const zip = body.zip;
    const state = body.state;
    const country = body.country;

    //Create token and charge
    stripe.accounts.create({ 
        type: 'custom',
        country: 'US',
        email: email,
        requested_capabilities: ['card_payments', 'transfers'],
        business_type: 'company',
        business_profile: {
            product_description: 'Gym',
            mcc: 7298
        },
        company: {
            name: company,
            tax_id: taxToken,
            phone: phone,
            address: {
                line1: line1,
                city: city,
                postal_code: zip,
                state: state,
                country: country,
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
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                relationship: {
                    owner: true,
                    account_opener: true,
                    title: 'Owner'
                },
                id_number: ssnToken,
                dob: {
                    day: day,
                    month: month,
                    year: year
                },
                address: {
                    line1: line1,
                    city: city,
                    postal_code: zip,
                    state: state,
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
    });
}

function addCard(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    const token = body.token.id;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeid !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;


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

function addTrainerCard(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    const token = body.token.id;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeid !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    //Add Card to Customer
    stripe.accounts.createExternalAccount(stripeid, {
        external_account: token
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
    const idToken = req.headers.authorization;

    let isValid = true;
    admin.auth().verifyIdToken(idToken).then(async decodedToken => {
        let uid = decodedToken.uid;
        let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
        userStripe = userStripe.val();
        if(stripeId !== userStripe) {
            isValid = false;
            send(res, 401, 'Unauthorized User');
            return;
        }
        return;
    }).catch(error => {
        isValid = false;
        send(res, 401, 'Could not decode user token');
        return;
    });

    if(!isValid) return;

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

function deleteTrainerCard(req, res){
    const body = JSON.parse(req.body);
    const cardId = body.cardId;
    const stripeId = body.stripeId;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeId !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    //Remove card from customer
    stripe.accounts.deleteExternalAccount(stripeId, cardId).then(card => {
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
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeid !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            console.log(error);
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

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

function listTrainerCards(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeid !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    stripe.accounts.listExternalAccounts(stripeid, {object: 'card'}).then(cards => {
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

function getBalance(req, res) {
    const body = JSON.parse(req.body);
    const stripeid = body.id;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeid !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    stripe.balance.retrieve({stripe_account: stripeid}).then(balance => {
        send(res, 200, {
            message: 'Success',
            balance: balance
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function setDefaultCard(req, res) {
    const body = JSON.parse(req.body);
    const stripeId =  body.id;
    const cardId = body.card;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeId !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    stripe.customers.update(stripeId, {
        default_source: cardId
    }).then(result => {
        send(res, 200, {
            message: 'Success',
            result: result
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function setDefaultTrainerCard(req, res) {
    const body = JSON.parse(req.body);
    const stripeId =  body.id;
    const cardId = body.card;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(async decodedToken => {
            let uid = decodedToken.uid;
            let userStripe = await admin.database().ref(`/users/${uid}/stripeId`).once('value');
            userStripe = userStripe.val();
            if(stripeId !== userStripe) {
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    stripe.accounts.updateExternalAccount(stripeId, cardId, {
        default_for_currency: true
    }).then(result => {
        send(res, 200, {
            message: 'Success',
            result: result
        });
        return;
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.message
        });
    });
}

function sendMessage(req, res) {
    const body = JSON.parse(req.body);
    const toPhone = "+1" + body.phone;
    const message = body.message;
    const user = body.user;
    const idToken = req.headers.authorization;

    let isValid = true;
    if(!idToken){
        send(res, 401, 'id Token not found');
        return;
    }else{
        admin.auth().verifyIdToken(idToken).then(decodedToken => {
            let uid = decodedToken.uid;
            if(uid !== user){
                isValid = false;
                send(res, 401, 'Unauthorized User');
                return;
            }
            return;
        }).catch(error => {
            isValid = false;
            send(res, 401, 'Could not decode user token');
            return;
        });
    }

    if(!isValid) return;

    twilio.messages.create({
        to: toPhone,
        from: '+18582408311',
        body: message
    }).then(message => {
        send(res, 200, {
            message: 'Success',
            result: result
        });
        return
    }).catch(err => {
        console.log(err);
        send(res, 500, {
            error: err.mesage
        });
    });
}

function send(res, code, body) {
    res.status(code).send({
        headers: {'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify(body),
    });
}

app.use(cors);
app.post('/stripe/charge', (req, res) => {
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

app.post('/stripe/createCustomer', (req, res) => {
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

app.post('/stripe/setDefaultCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        setDefaultCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
})

app.post('/stripe/setDefaultTrainerCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        setDefaultTrainerCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
})

app.post('/stripe/addCard', (req, res) => {
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

app.post('/stripe/addTrainerCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        addTrainerCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
});

app.post('/stripe/deleteCard', (req, res) => {
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

app.post('/stripe/deleteTrainerCard', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        deleteTrainerCard(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }
});

app.post('/stripe/listCards', (req, res) => {
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

app.post('/stripe/listTrainerCards', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        listTrainerCards(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }   
});

app.post('/stripe/createTrainer', (req, res) => {
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

app.post('/stripe/createOwner', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        createOwner(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }   
});

app.post('/stripe/getBalance', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        getBalance(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }   
}); 

app.post('/twilio/sendMessage', (req, res) => {
    //Catch any unexpected errors to prevent crashing
    try {
        sendMessage(req, res);
    } catch(e) {
        console.log(e);
        send(res, 500, {
            error: JSON.stringify(e)
        });
    }  
});

exports.fb = functions.https.onRequest(app);