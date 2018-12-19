// include global styles
require('purecss/build/base-min.css');
require('../styles/main.scss');
require('../styles/globalDynamicStyles');

// Required to setup Keen UI, should be imported only once in your project
require('keen-ui/src/bootstrap');

// configure Keen
const KeenUiConfig = require('keen-ui/src/config').default;
KeenUiConfig.set(require('../keen-config/options.json'));
require('../keen-config/font-stack.scss');

// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');

// Shim Array includes for ES7 spec compliance
require('array-includes').shim();

// set up logging
const logging = require('kolibri.lib.logging').default;

logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// Create an instance of the global app object.
// This is exported by webpack as the kolibriGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
//
// This is achieved by setting the `src_file` attribute in the core
// kolibri_plugin.py which tells the webpack build scripts to set the export of this file
// to a global variable.
const CoreAppConstructor = require('./constructor').default;

const coreApp = new CoreAppConstructor();

// Use a module.exports here to be compatible with webpack library output
module.exports = coreApp;
