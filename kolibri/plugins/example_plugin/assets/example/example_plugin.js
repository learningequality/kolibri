'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var Plugin = require('plugin_base');

var ExamplePlugin = Plugin.extend({

    events: {
        'something_happened': 'hello_world'
    },
    once : {
        'nothing_happened': 'hello_world'
    },
    hello_world: function(message) {
        logging.info('Hello world!', message);
    }
});

var examplePlugin = new ExamplePlugin();

module.exports = examplePlugin;
