'use strict';

var logging = require('loglevel');
var KolibriModule = require('kolibri_module');

logging.setDefaultLevel(2);
logging.info('Component demo loaded!');

var Plugin = KolibriModule.extend({
  initialize: function() {
    logging.info('Demo initialized!');
  }
});


var plugin = new Plugin();
