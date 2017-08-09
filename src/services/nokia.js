const OAuth = require('oauth');

const HOSTNAME = process.env.HOSTNAME;

let Nokia = function (apiKey, apiSecret, callbackUrl) {
    this._apiKey = apiKey;
    this._apiSecret = apiSecret;
    this._callbackUrl = callbackUrl;

    this._oAuth = new OAuth.OAuth(
        'https://developer.health.nokia.com/account/request_token',
        'https://developer.health.nokia.com/account/access_token',
        apiKey,
        apiSecret,
        '1.0',
        callbackUrl,
        'HMAC-SHA1'
    );
}

/**
 * Builds a Nokia subscription url
 * @param {number} user Nokia user id
 * @param {number} appli Type of measurements to subscribe to.
 * @see https://developer.health.nokia.com/api/doc#api-Notification-notify_subscribe
 */
Nokia.prototype._subscriptionUrl = function (user, appli) {
    return 'https://api.health.nokia.com/notify'
        + '?action=subscribe'
        + '&userid=' + user
        + '&callbackurl=' + HOSTNAME + 'webhook/nokia/' + user + '/' + appli
        + '&appli=' + appli;
}
/**
 * Requests an OAuth 1.0 request token from the Nokia Health API, and stores it in the database. Also builds an authorization
 * url that can be sent to a user in order to authorize Paula to access the user's data on the API
 * @param {number} fbUser Facebook user id to associate this token with
 * @param {function} callback Callback function called with (error, authentication URL)
 */
Nokia.prototype.getRequestUrl = function (fbUser, callback) {
    // We need a new OAuth object, because the callback url is specific to each user
    const nokiaAPI = new OAuth.OAuth(
        'https://developer.health.nokia.com/account/request_token',
        'https://developer.health.nokia.com/account/access_token',
        this._apiKey,
        this._apiSecret,
        '1.0',
        this._callbackUrl + fbUser,
        'HMAC-SHA1'
    );
    nokiaAPI.getOAuthRequestToken((error, oAuthToken, oAuthTokenSecret, results) => {
        let authUrl = 'https://developer.health.nokia.com/account/authorize?'
            + 'oauth_consumer_key=' + this._apiKey
            + '&oauth_token=' + oAuthToken;
        if (error) {
            callback(error);
            return;
        }
        callback(null, authUrl, oAuthToken, oAuthTokenSecret);
    });
}

/**
 * Fetches new data since last update from the Nokia Health API for a single user
 * @param {number} userid Facebook id or nokia user id
 * @param {int} lastUpdate Last update datetime in epoch timestamp format
 * @param {any} callback Callback function, called when the request is completed
 * @see https://developer.health.nokia.com/api/doc#api-Measure-get_measure
 */
Nokia.prototype.getMeasurements = function (nokiaUser, accessToken, accessSecret, lastUpdate, callback) {
    let url = 'https://api.health.nokia.com/measure' + '?action=getmeas' + '&userid=' + nokiaUser + '&lastupdate=' + Math.round(lastUpdate);
    let signedUrl = this._oAuth.signUrl(url, accessToken, accessSecret);

    this._oAuth.get(signedUrl, null, null, (error, response) => {
        let responseData = JSON.parse(response);
        if (isDefined(responseData.body)) {
            let measureGroups = responseData.body.measuregrps;
            callback(measureGroups);
        }
    });
}

Nokia.prototype.subscribe = function (nokiaUser, accessToken, accessSecret, type, callback) {
    let signedUrl = this._oAuth.signUrl(this._subscriptionUrl(nokiaUser, type), row.oauth_access_token, row.oauth_access_secret);
    this._oAuth.get(signedUrl, null, null, callback);
}

Nokia.prototype.getAccessToken = function (requestToken, requestSecret, verifier, callback) {
    this._oAuth.getOAuthAccessToken(requestToken, requestSecret, verifier, callback);
}

module.exports = Nokia;