const request = require('request');
const ClientOAuth2 = require('client-oauth2');
const wunderlistSDK = require('wunderlist');

let Wunderlist = function () {
    this._wunderlistAuth = new ClientOAuth2({
        clientId: '8931d36b605a3fe1900f',
        clientSecret: 'f0ea3e820e2337747b92407517144075cc2b171a1c5b566e56148ef4add8',
        accessTokenUri: 'https://www.wunderlist.com/oauth/access_token',
        authorizationUri: 'https://www.wunderlist.com/oauth/authorize',
        redirectUri: 'https://smart-paula.herokuapp.com/connect/wunderlist'
    });
};

Wunderlist.prototype.getAuthUri = function () {
    return this._wunderlistAuth.code.getUri();
}

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

    // return this._wunderlistAuth.code.getToken(reqUri).then((user) => {
    //     return user.accessToken;
    // }, (err) => {console.log(err)});
}

Wunderlist.prototype.baa = function () {
    console.log('baa')
}

module.exports = Wunderlist