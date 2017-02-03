
// include global styles
require('normalize.css');
require('../styles/font-NotoSans.css');
require('../styles/core-global.styl');

// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');

// set up logging
const logging = require('kolibri.lib.logging');
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Create an instance of the global app object.
// This is exported by webpack as the kolibriGlobal object, due to the 'output.library' flag
// which exports the module.exports at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
//
// This is achieved by setting the `src_file` attribute in the core
// kolibri_plugin.py which tells the webpack build scripts to set the export of this file
// to a global variable.
const CoreAppConstructor = require('./constructor');

module.exports = new CoreAppConstructor();
