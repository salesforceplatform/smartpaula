const express = require('express')
const portal = express.Router()

module.exports = function (portal) {
    portal.get('/', function (req, res) {
        res.send('portal!');
    })
}