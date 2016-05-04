'use strict';

var _ = require('lodash');
var logging = require('loglevel');

// This is aliased for your convenience!
var KolibriModule = require('kolibri_module');

var LearnModule = KolibriModule.extend({

    start: function(message) {
        logging.info('Hello world!', message);
    }
});

var learnModule = new LearnModule();
