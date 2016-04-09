'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var ExampleModule = KolibriModule.extend({

    hello_world: function(message) {
        logging.info('Hello world!', message);
    }
});

var exampleModule = new ExampleModule();

module.exports = exampleModule;
