'use strict';

var logging = require('loglevel');
var riot = require('riot');

logging.setDefaultLevel(2);
logging.info('Riot demo loaded!');

require('./riot-tags/app.tag');

riot.mount('app');





// var KolibriModule = require('kolibri_module');

// var Plugin = KolibriModule.extend({
//   initialize: function() {
//     logging.info('Demo initialized!');
//   }
// });


// var plugin = new Plugin();
