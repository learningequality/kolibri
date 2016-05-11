
const Kolibri = require('./facade/facade');

const logging = require('loglevel');

const kolibri = new Kolibri();

logging.setDefaultLevel(2);

logging.info('Kolibri Initialized');

module.exports = kolibri;
