'use strict';

var logging = require('loglevel');
var riot = require('riot');

logging.setDefaultLevel(2);
logging.info('Riot demo loaded!');

require('normalize-css');
require('./riot-tags/app.tag.html');

riot.mount('app');





// var KolibriModule = require('kolibri_module');

// var Plugin = KolibriModule.extend({
//   initialize: function() {
//     logging.info('Demo initialized!');
//   }
// });


// var plugin = new Plugin();
