'use strict';

var _ = require('lodash');
var logging = require('loglevel');

var Plugin = require('plugin_base');

var ExamplePlugin = Plugin.extend({

    events: {
        'something_happened': 'hello_world'
    },
    hello_world: function(plugin) {
        if (plugin === this) {
            logging.info('Hello world!');
            logging.info(this);
            this.stop_listening('kolibri_register', this.hello_world);
        }
    }
});

var examplePlugin = new ExamplePlugin();

module.exports = examplePlugin;
