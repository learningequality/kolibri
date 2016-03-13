'use strict';

var Kolibri = require('./facade/facade');

var logging = require('loglevel');

var kolibri = new Kolibri();

logging.setDefaultLevel(2);

logging.info('Kolibri Initialized');

module.exports = kolibri;
