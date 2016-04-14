'use strict';

var logging = require('loglevel');
var KolibriModule = require('kolibri_module');

logging.setDefaultLevel(2);
logging.info('Component demo loaded!');

var ComponentDemoPlugin = KolibriModule.extend({
  initialize: function() {
    logging.info('Demo initialized!');
    app.start();
  }
});

