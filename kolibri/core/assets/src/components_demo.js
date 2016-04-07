'use strict';
var components = require('components');
var logging = require('loglevel');
var KolibriModule = require('kolibri_module');

logging.setDefaultLevel(2);

logging.info('Component demo loaded!');


var ComponentDemoPlugin = KolibriModule.extend({

    events: {},

    once: { /* I'm broken, don't use me */ },

    initialize: function() {
        logging.info('Demo initialized!');
    },
});

var cpd = new ComponentDemoPlugin();

module.exports = {};
