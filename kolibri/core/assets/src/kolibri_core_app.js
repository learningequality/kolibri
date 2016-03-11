'use strict';

var Mediator = require('./mediator/mediator');
var logging = require('loglevel');
var _ = require('lodash');

var public_methods = [
    'register_plugin_async',
    'register_plugin_sync',
    'stop_listening',
    'trigger'
];

// Bind 'this' value for public methods - those that will be exposed in the Facade.
_.bindAll(Mediator, public_methods);

var lib = {
    Backbone: require('backbone'),
    loglevel: logging,
    _: require('lodash')
};

var Kolibri = _.extend({
    lib: lib,
    plugins: Mediator._plugin_registry
}, _.pick(Mediator, public_methods));

logging.setDefaultLevel(2);

logging.info('Kolibri Initialized');

module.exports = Kolibri;
