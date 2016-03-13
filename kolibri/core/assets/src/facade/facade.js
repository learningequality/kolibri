'use strict';

var Mediator = require('../mediator/mediator');
var _ = require('lodash');

var public_methods = [
    'register_plugin_async',
    'register_plugin_sync',
    'stop_listening',
    'trigger'
];

var lib = function() {};
lib.prototype.Backbone = require('backbone');
lib.prototype.loglevel = require('loglevel');
lib.prototype._ = require('lodash');


var Kolibri = function() {
    this.lib = new lib();
    var mediator = new Mediator();

    // Bind 'this' value for public methods - those that will be exposed in the Facade.
    _.bindAll(mediator, public_methods);
    this.plugins = mediator._plugin_registry;
    _.extend(this, _.pick(mediator, public_methods));
};

module.exports = Kolibri;
