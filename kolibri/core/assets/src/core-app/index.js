
// include global styles
require('normalize.css');
require('../styles/font-NotoSans.css');
require('keen-ui/dist/keen-ui.css');
require('../styles/core-global.styl');

// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');

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
