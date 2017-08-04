const ClientOAuth2 = require('client-oauth2')
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

Wunderlist.prototype.getAuthUri = function (userId) {
    return this._wunderlistAuth.code.getUri({ redirectUri: 'https://smart-paula.herokuapp.com/connect/wunderlist/' + userId });
}

Wunderlist.prototype.getAccessToken = function (reqUri, userId) {
    return this._wunderlistAuth.code.getToken(reqUri, { redirectUri: 'https://smart-paula.herokuapp.com/connect/wunderlist/' + userId }).then((user) => {
        return user.accessToken;
    }, (err) => {console.log(err)});
}

Wunderlist.prototype.baa = function () {
    console.log('baa')
}

module.exports = Wunderlist