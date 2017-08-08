#!/usr/bin/env node

var request = require('request');
var HOSTNAME = process.env.HOSTNAME;

request.post(HOSTNAME + 'webhook/scheduler')