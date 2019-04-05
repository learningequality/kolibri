// Shim Array includes for ES7 spec compliance
require('array-includes').shim();
// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');
require('url-polyfill');

// Do this before any async imports to ensure that public paths
// are set correctly
require('kolibri.urls').default.setUp();
// include global styles
require('purecss/build/base-min.css');
require('../styles/main.scss');
require('../styles/globalDynamicStyles');
require('./vuexModality');
require('./monitorPageVisibility');

// Required to setup Keen UI, should be imported only once in your project
require('keen-ui/src/bootstrap');

// configure Keen
const KeenUiConfig = require('keen-ui/src/config').default;
KeenUiConfig.set(require('../keen-config/options.json'));
require('../keen-config/font-stack.scss');

// set up logging
const logging = require('kolibri.lib.logging').default;

logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// optionally set up client-side Sentry error reporting
if (global.sentryDSN) {
  require.ensure(['@sentry/browser'], function(require) {
    const Sentry = require('@sentry/browser');
    const Vue = require('vue');

    Sentry.init({
      dsn: global.sentryDSN,
      release: __version,
      integrations: [new Sentry.Integrations.Vue({ Vue })],
    });
    logging.warn('Sentry error logging is enabled - this disables some local error reporting!');
    logging.warn(
      '(see https://github.com/vuejs/vue/issues/8433 and https://docs.sentry.io/platforms/javascript/vue/)'
    );
  });
}

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
