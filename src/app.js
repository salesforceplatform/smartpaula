'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('node-uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');
const { Pool, Client } = require('pg');
const util = require('util');
const OAuth = require('oauth');
const Q = require('q');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = process.env.APIAI_ACCESS_TOKEN;
const APIAI_LANG = process.env.APIAI_LANG || 'nl';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const NOKIA_API_KEY = process.env.NOKIA_API_KEY;
const NOKIA_API_SECRET = process.env.NOKIA_API_SECRET;
const HOSTNAME = process.env.HOSTNAME;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const apiAiService = apiai(APIAI_ACCESS_TOKEN, {
    language: APIAI_LANG,
    requestSource: "fb"
});

const nokiaAPI = new OAuth.OAuth(
    'https://developer.health.nokia.com/account/request_token',
    'https://developer.health.nokia.com/account/access_token',
    NOKIA_API_KEY,
    NOKIA_API_SECRET,
    '1.0',
    HOSTNAME + 'webhook/nokia',
    'HMAC-SHA1'
);
const sessionIds = new Map();

const DEFAULT_INTENTS = ['57b82498-053c-4776-8be9-228c420e6c13', 'b429ecdc-21f4-4a07-8165-3620023185ba'];
const DEFAULT_INTENT_REFER_TO = '1581441435202307';

function handleResponse(response, sender) {
    if (isDefined(response.result)) {
        let responseText = response.result.fulfillment.speech;
        let responseData = response.result.fulfillment.data;
        let resolvedQuery = response.result.resolvedQuery
        let action = response.result.action; //actie in intent
        let intent = response.result.metadata.intentId;
        let parameters = response.result.parameters;

        console.log(response.result);

        if (isDefined(responseData) && isDefined(responseData.facebook)) {
            if (!Array.isArray(responseData.facebook)) {
                try {
                    console.log('Response as formatted message');
                    sendFBMessage(sender, responseData.facebook + ' geformatteerd bericht');
                } catch (err) {
                    sendFBMessage(sender, {
                        text: err.message
                    });
                }
            } else {
                responseData.facebook.forEach((facebookMessage) => {
                    try {
                        if (facebookMessage.sender_action) {
                            console.log('Response as sender action');
                            //sendFBMessage(sender, ' debug fb action: ' + sender_action);
                            sendFBSenderAction(sender, facebookMessage.sender_action);
                        } else {
                            console.log('Response as formatted message');
                            sendFBMessage(sender, facebookMessage + ' geformatteerd bericht 2');
                        }
                    } catch (err) {
                        sendFBMessage(sender, {
                            text: err.message
                        });
                    }
                });
            }
            //hier komen de standaard tekst antwoorden van api.ai terecht
        } else if (isDefined(responseText)) {
            let beforeSending = [];
            let message = {
                text: responseText
            };
            let quickReplies = [{
                "content_type": "text",
                "title": "😁",
                "payload": "4"
            },
            {
                "content_type": "text",
                "title": "🙂",
                "payload": "3"
            },
            {
                "content_type": "text",
                "title": "😞",
                "payload": "2"
            },
            {
                "content_type": "text",
                "title": "😡",
                "payload": "1"
            },
            {
                "content_type": "text",
                "title": "N.v.t",
                "payload": "0"
            }
            ];
            console.log('Response as text message');

            // Controleer of het antwoord uit de default intents voortkomt. Zo ja, stuur de vraag dan door.
            if (DEFAULT_INTENTS.includes(intent)) {
                getFBProfile(sender, (profile) => {
                    // Disabled while in development
                    // sendFBMessage(DEFAULT_INTENT_REFER_TO, {text:'Hallo, ik heb een vraag gekregen van ' + profile.first_name + ' ' + profile.last_name + ' die ik niet kan beantwoorden:\n "' + resolvedQuery + '"'})
                    console.log('Default intent')
                });
            }

            //achterhaal of er intelligentie nodig is
            var speech = "";
            switch (action) {
                case "who_are_you": //check if user is known
                    speech += action;
                    break;
                case "pam_sum": //calculate PAM score
                    let payload = response.result.payload;
                    let score = parameters.pam_score;


                    if (isDefined(score)) {
                        console.log(action, 'score is defined', score);

                        pool.query('SELECT id FROM vragenlijsten WHERE fbuser = $1 ORDER BY gestart DESC LIMIT 1', [sender])
                            .then(res => {
                                let vragenlijst = res.rows[0].id;
                                console.log('vragenlijst', vragenlijst);
                                pool.query('SELECT * FROM antwoorden WHERE vragenlijst = $1', [vragenlijst])
                                    .then(res => {
                                        let answer_no = res.rowCount + 1;
                                        console.log('answer_no', answer_no);
                                        pool.query('INSERT INTO antwoorden (vragenlijst, waarde, antwoord_op, vraag) VALUES ($1, $2, (SELECT NOW()), $3)', [vragenlijst, score, answer_no]);
                                    });
                            });

                        if (isDefined(payload)) {
                            console.log(payload);
                            if (isDefined(payload.vragenlijst_end)) {
                                console.log(payload.vragenlijst_end);
                            }
                        }
                    }

                    if (!(isDefined(payload) && isDefined(payload.vragenlijst_end) && payload.vragenlijst_end)) {
                        message.quick_replies = quickReplies;
                    }
                    break;
                case "start_vragenlijst":
                    pool.query({ text: 'INSERT INTO vragenlijsten (fbuser, vragenlijst) VALUES($1, $2)', values: [sender, parameters.vragenlijst] })
                        .then(res => { console.log(res); })
                        .catch(e => console.error(e, e.stack));
                    break;
                case "connect_service":
                    let service = response.result.parameters.service;
                    if (isDefined(service)) {
                        switch (service) {
                            case "Nokia":
                                getNokiaRequestToken(sender, (error, url) => { sendFBMessage(sender, { text: url }); });
                                break;
                        }
                    }
                    break;
                default:
                    speech += 'Sorry, de actie is niet bekend.';
            }

            // facebook API limit for text length is 640,
            // so we must split message if needed
            let splittedText = splitResponse(message.text);

            async.eachSeries(splittedText, (textPart, callback) => {
                //sendFBMessage(sender, {text: textPart + ' debug callback: ' + speech}, callback);
                message.text = textPart;
                sendFBMessage(sender, message, callback);
            });
        }

        response.result.fulfillment.messages.forEach(function (message) {
            let payload = message.payload
            console.log(message)
            if (isDefined(payload)) {
                let followUp = payload.followUp;
                let vragenlijst_end = payload.vragenlijst_end;
                if (isDefined(followUp)) {
                    let request = apiAiService.eventRequest({
                        name: followUp
                    }, {
                            sessionId: sessionIds.get(sender)
                        });

                    request.on('response', (response) => { handleResponse(response, sender); });
                    request.on('error', (error) => console.error(error));

                    request.end();
                }

                if (isDefined(vragenlijst_end) && vragenlijst_end) {
                    pool.query('SELECT id FROM vragenlijsten WHERE fbuser = $1 ORDER BY gestart DESC LIMIT 1', [sender]).then(res => {
                        let vragenlijst = res.rows[0].id;
                        pool.query('UPDATE vragenlijsten set gestopt = (SELECT NOW()) WHERE id = $1', [vragenlijst])
                    });
                }
            }
        }, this);

    }
}

function processEvent(event) {
    var sender = event.sender.id.toString();

    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {
        var text = event.message ? event.message.text : event.postback.payload;
        // Handle a text message from this sender

        if (!sessionIds.has(sender)) {
            sessionIds.set(sender, uuid.v1());
        }

        console.log("proces event: ", text);
        //send message to api.ai
        let apiaiRequest = apiAiService.textRequest(text, {
            sessionId: sessionIds.get(sender)
        });
        //receive message from api.ai
        apiaiRequest.on('response', (response) => { handleResponse(response, sender); });
        apiaiRequest.on('error', (error) => console.error('Error: ' + error));
        apiaiRequest.end();
    }
}

function splitResponse(str) {
    if (str.length <= 640) {
        return [str];
    }

    return chunkString(str, 640);
}

function chunkString(s, len) {
    var curr = len,
        prev = 0;

    var output = [];

    while (s[curr]) {
        if (s[curr++] == ' ') {
            output.push(s.substring(prev, curr));
            prev = curr;
            curr += len;
        } else {
            var currReverse = curr;
            do {
                if (s.substring(currReverse - 1, currReverse) == ' ') {
                    output.push(s.substring(prev, currReverse));
                    prev = currReverse;
                    curr = currReverse + len;
                    break;
                }
                currReverse--;
            } while (currReverse > prev)
        }
    }
    output.push(s.substr(prev));
    return output;
}

function getFBProfile(facebookId, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/' + facebookId,
        qs: {
            access_token: FB_PAGE_ACCESS_TOKEN
        },
        method: 'GET'
    }, (error, response, body) => {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        } else if (callback) {
            callback(JSON.parse(body));
        }
    });
}

function sendFBMessage(sender, messageData, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: FB_PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData
        }
    }, (error, response, body) => {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

        if (callback) {
            callback();
        }
    });
}

function sendFBSenderAction(sender, action, callback) {
    setTimeout(() => {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: FB_PAGE_ACCESS_TOKEN
            },
            method: 'POST',
            json: {
                recipient: {
                    id: sender
                },
                sender_action: action
            }
        }, (error, response, body) => {
            if (error) {
                console.log('Error sending action: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }
            if (callback) {
                callback();
            }
        });
    }, 1000);
}

function getNokiaRequestToken(fbUser, callback) {
    const nokiaAPI = new OAuth.OAuth(
        'https://developer.health.nokia.com/account/request_token',
        'https://developer.health.nokia.com/account/access_token',
        NOKIA_API_KEY,
        NOKIA_API_SECRET,
        '1.0',
        HOSTNAME + 'connect/nokia/' + fbUser,
        'HMAC-SHA1'
    );
    nokiaAPI.getOAuthRequestToken((error, oAuthToken, oAuthTokenSecret, results) => {
        let authUrl = 'https://developer.health.nokia.com/account/authorize?'
            + 'oauth_consumer_key=' + NOKIA_API_KEY
            + '&oauth_token=' + oAuthToken;
        if (error) {
            callback(error);
            return;
        }
        pool.query('DELETE FROM connect_nokia WHERE fbuser = $1', [fbUser]).then(() => {
            pool.query('INSERT INTO connect_nokia (fbuser, oauth_request_token, oauth_request_secret) VALUES ($1, $2, $3)', [fbUser, oAuthToken, oAuthTokenSecret]);
        });
        callback(null, authUrl);
    });
}

function getNokiaMeasurements(userid, callback) {
    pool.query('SELECT *, extract(epoch from last_update) as time FROM connect_nokia WHERE fbuser = $1 OR nokia_user = $1', [userid]).then(res => {
        let user = res.rows[0];
        if (isDefined(user)) {
            let url = 'https://api.health.nokia.com/measure' + '?action=getmeas' + '&userid=' + user.nokia_user + '&lastupdate=' + Math.round(user.time);
            let signedUrl = nokiaAPI.signUrl(url, user.oauth_access_token, user.oauth_access_secret);
            console.log(signedUrl);
            console.log(user);

            nokiaAPI.get(signedUrl, null, null, (error, response) => {
                let responseData = JSON.parse(response);
                console.log(responseData);
                if (isDefined(responseData.body)){
                    let measureGroups = responseData.body.measuregrps;
                    let measureTypes = [];
                    measureGroups.forEach(group => {
                        let date = new Date(group.date * 1000).toISOString().slice(0, 19).replace('T', ' ');
                        group.measures.forEach(measurement => {
                            let type = measurement.type;
                            let value = measurement.value * Math.pow(10, measurement.unit);
                            measureTypes.push(type);
                            if (type === 9) {
                                pool.query("INSERT INTO measure_blood (fbuser, measure_date, diastolic) VALUES ($1, $2, $3) ON CONFLICT (fbuser, measure_date) DO UPDATE SET diastolic = excluded.diastolic", [user.fbuser, date, value]);
                            }
                            if (type === 10) {
                                pool.query("INSERT INTO measure_blood (fbuser, measure_date, systolic) VALUES ($1, $2, $3) ON CONFLICT (fbuser, measure_date) DO UPDATE SET systolic = excluded.systolic", [user.fbuser, date, value]);
                            }
                            if (type === 11) {
                                pool.query("INSERT INTO measure_blood (fbuser, measure_date, pulse) VALUES ($1, $2, $3) ON CONFLICT (fbuser, measure_date) DO UPDATE SET pulse = excluded.pulse", [user.fbuser, date, value]);
                            }
                            if (type === 1) {
                                pool.query("INSERT INTO measure_weight (fbuser, measure_date, weight) VALUES ($1, $2, $3) ON CONFLICT (fbuser, measure_date) DO UPDATE SET value = excluded.value", [user.fbuser, date, value]);
                            }
                        });
                    })
                    pool.query('UPDATE connect_nokia SET last_update = (SELECT NOW()) WHERE fbuser = $1 OR nokia_user = $1', [userid]);
                    console.log(measureTypes);
                    if (measureTypes.length > 0) {
                        sendMeasurementMessage(measureTypes, user.fbuser);
                    }
                }

            })
        }
    });
}

function sendMeasurementMessage(types, user) {
    let event = 'new_measurement_';

    if (types.length === 3 && types.includes(9) && types.includes(10) && types.includes(9)) {
        event += 'blood';
    } else if (types.length === 1 && types[0] === 1) {
        event += 'weight';
    } else {
        event += 'multiple';
    }

    console.log(event);

    let request = apiAiService.eventRequest({
        name: event
    }, {
            sessionId: sessionIds.get(user)
        });

    request.on('response', (response) => { handleResponse(response, user); });
    request.on('error', (error) => console.error(error));

    request.end
}

function nokiaSubscriptionUrl(user, appli){
    return 'https://api.health.nokia.com/notify'
        + '?action=subscribe'
        + '&userid=' + user
        + '&callbackurl=' + HOSTNAME + 'webhook/nokia/' + user + '/' + appli
        + '&appli=' + appli;
}

function subscribeToNokia(fbuser) {
    
    let query = { text: 'SELECT * FROM connect_nokia' };
    if (isDefined(fbuser)) {
        query.text += ' WHERE fbuser = $1';
        query.values = [fbuser];
    }
    pool.query(query).then(res => {
        res.rows.forEach(row => {
            let signedUrl = nokiaAPI.signUrl(nokiaSubscriptionUrl(row.nokia_user, 4), row.oauth_access_token, row.oauth_access_secret);
            nokiaAPI.get(signedUrl, null, null, (error, responseData) => { if (error) console.log(error); });
            signedUrl = nokiaAPI.signUrl(nokiaSubscriptionUrl(row.nokia_user, 1), row.oauth_access_token, row.oauth_access_secret);
            nokiaAPI.get(signedUrl, null, null, (error, responseData) => { if (error) console.log(error); });

            getNokiaMeasurements(row.fbuser);

        });
    })
}

function doSubscribeRequest() {
    request({
        method: 'POST',
        uri: "https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=" + FB_PAGE_ACCESS_TOKEN
    },
        (error, response, body) => {
            if (error) {
                console.error('Error while subscription: ', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });
}

function isDefined(obj) {
    if (typeof obj == 'undefined') {
        return false;
    }

    if (!obj) {
        return false;
    }

    return obj != null;
}

const app = express();
const frontofficeid = 1533050426761050;

app.use(bodyParser.text({
    type: 'application/json'
})); //geen response als deze weggelaten wordt
app.use(bodyParser.urlencoded({
    extended: false
})); //toegevoegd: heeft invloed verwerking event
app.use(bodyParser.json()); //toegevoegd: corrigeert de werking weer                    

var debugtekst = "";

// Server frontpage
app.get('/', function (req, res) {
    res.send('This is Paula');
});

app.get('/connect/nokia/:fbUserId', (req, res) => {
    try {
        let fbUser = req.params.fbUserId;
        let userid = req.query.userid;
        let oAuthToken = req.query.oauth_token;
        let oAuthVerifier = req.query.oauth_verifier;

        pool.query("SELECT * FROM connect_nokia WHERE fbuser = $1", [fbUser])
            .then(result => {
                let userOAuth = result.rows[0];
                console.log(userOAuth);
                nokiaAPI.getOAuthAccessToken(
                    userOAuth.oauth_request_token,
                    userOAuth.oauth_request_secret,
                    oAuthVerifier,
                    (error, oAuthToken, oAuthTokenSecret, results) => {
                        if (error) {
                            console.log(error);
                            response.end(JSON.stringify({
                                message: 'Error occured while getting access token',
                                error: error
                            }));
                            return;
                        }

                        pool.query('UPDATE connect_nokia SET oauth_access_token = $1, oauth_access_secret = $2, nokia_user = $3, last_update = \'epoch\' WHERE fbuser = $4', [oAuthToken, oAuthTokenSecret, userid, fbUser]).then(() => {
                            let request = apiAiService.eventRequest({
                                name: 'nokia_connected'
                            }, {
                                    sessionId: sessionIds.get(fbUser)
                                });

                            request.on('response', (response) => { handleResponse(response, fbUser); });
                            request.on('error', (error) => console.error(error));

                            request.end();
                            subscribeToNokia(fbUser);
                        });

                    });
            })
        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(() => {
            doSubscribeRequest();
        }, 5000);
    } else {
        res.send('Error, wrong validation token');
    }
});

//ontvangen van FB bericht
app.post('/webhook/', (req, res) => {
    try {
        var data = JSONbig.parse(req.body);

        if (data.entry) {
            let entries = data.entry;
            entries.forEach((entry) => {
                let messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach((event) => {
                        if (event.message && !event.message.is_echo ||
                            event.postback && event.postback.payload) {
                            //sendFBMessage(event.sender.id, {text: "Debugtekst fb: " + debugtekst});
                            processEvent(event);
                            //sendFBMessage(event.sender.id, {text: "Jij bent: " + event.sender.id});
                        }
                    });
                }
            });
        }

        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.all('/webhook/nokia/:userid/:type', (req, res) => {
    try {
        let startDate = req.body.startdate;
        let enddate = req.body.enddate;

        getNokiaMeasurements(req.params.userid);

        return res.status(200).end();
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});


//bewerking van api.ai vanuit webhook alvorens terug te sturen
//app.post('/herokuai', function (req1, res1) {
//         try {
//         var requestBody = req1.action;
//         debugtekst = "herokuai webhook: " + requestBody.action;
//            } catch (err) {
//                console.error("Can't process request", err);
//                debugtekst = "herokuai webhook err: " + err;
//         }
//});


app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});

doSubscribeRequest();
subscribeToNokia();