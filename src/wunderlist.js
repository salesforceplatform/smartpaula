const request = require('request');
const ClientOAuth2 = require('client-oauth2');
const WunderlistSDK = require('wunderlist');

/**
 * Create a new Wunderlist API object
 * @param {string} clientId Your Wunderlist client ID
 * @param {string} clientSecret Your Wunderlist Client secret
 * @param {string} redirectUri URL a user is sent to after login in to Wunderlist and authorizing your app
 * @see https://developer.wunderlist.com/documentation
 */
let Wunderlist = function (clientId, clientSecret, redirectUri) {
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._redirectUri = redirectUri;

    this._wunderlistAuth = new ClientOAuth2({
        clientId: clientId,
        clientSecret: clientSecret,
        accessTokenUri: 'https://www.wunderlist.com/oauth/access_token',
        authorizationUri: 'https://www.wunderlist.com/oauth/authorize',
        redirectUri: redirectUri
    });

    return this;
};

Wunderlist.prototype.getAuthUri = function () {
    return this._wunderlistAuth.code.getUri();
};

Wunderlist.prototype.getAccessToken = function (code, userId, callback) {
    return request({
        url: 'https://www.wunderlist.com/oauth/access_token',
        method: 'POST',
        json: true,
        body: {
            client_id: '8931d36b605a3fe1900f',
            client_secret: 'f0ea3e820e2337747b92407517144075cc2b171a1c5b566e56148ef4add8',
            code: code
        }
    }, (error, response, body) => {
        console.log(error, body);
        if (callback) {
            callback(body.access_token);
        }
    });
};

/**
 * Create a new Wunderlist for a user.
 * @param {string} accessToken Access Token for the user the list should be created for.
 */
Wunderlist.prototype.createList = function (accessToken) {
    let wunderlistAPI = new WunderlistSDK({
        'accessToken': accessToken,
        'clientID': this._clientId
    });

    return wunderlistAPI.http.lists.create()
        .done(function (listData, statusCode) {
            console.log(listData)
            if (statusCode === 200) {
                return listData;
            }
        })
        .fail(function (resp, code) {
            // ...
        });
};

module.exports = Wunderlist;