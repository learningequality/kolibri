
// include global styles
require('normalize.css');
require('../styles/font-NotoSans.css');
require('../styles/core-global.styl');

// polyfill for older browsers
require('core-js/es6/object');
require('core-js/es6/symbol');
require('core-js/es6/promise');

// set up logging
const logging = require('kolibri.lib.logging');
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Create an instance of the global app object.
// This is automatically attached to the kolibriGlobal object ... somehow?
//
// TODO - clarify how setting the `src_file` attribute in the core
// kolibri_plugin.py attaches this object to the global variable.
const CoreAppConstructor = require('./constructor');
module.exports = new CoreAppConstructor();
