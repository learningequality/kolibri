
// include global styles
require('normalize.css');
require('./global.styl');

// set up logging
const logging = require('loglevel');
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Create an instance of the global app object.
// This is automatically attached to the kolibriGlobal object ... somehow?
//
// TODO - clarify how setting the `src_file` attribute in the core
// kolibri_plugin.py attaches this object to the global variable.
const CoreAppConstructor = require('./core_app_constructor');
module.exports = new CoreAppConstructor();
