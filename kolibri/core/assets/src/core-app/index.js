// Shim Array includes for ES7 spec compliance
require('array-includes').shim();
// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
require('core-js');
require('url-polyfill');

// Do this before any async imports to ensure that public paths
// are set correctly
require('kolibri.urls').default.setUp();

// set up theme
const theme = require('kolibri-components/src/styles/theme');

theme.setBrandColors(global.kolibriTheme.brandColors);
theme.setTokenMapping(global.kolibriTheme.tokenMapping);

// Required to setup Keen UI, should be imported only once in your project
require('keen-ui/src/bootstrap');

// configure Keen
const KeenUiConfig = require('keen-ui/src/config').default;
KeenUiConfig.set(require('../keen-config/options.json'));
require('../keen-config/font-stack.scss');

// global styles
require('../styles/main.scss');

// monitor page visibility
require('./monitorPageVisibility');

// set up logging
const logging = require('kolibri.lib.logging').default;

logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// optionally set up client-side Sentry error reporting
if (global.sentryDSN) {
  require.ensure(['@sentry/browser'], function(require) {
    const Sentry = require('@sentry/browser');
    const SentryIntegrations = require('@sentry/integrations');
    const Vue = require('./kolibriVue');

    Sentry.init({
      dsn: global.sentryDSN,
      environment: global.sentryEnv,
      release: __version,
      integrations: [new SentryIntegrations.Vue({ Vue: Vue.default })],
      beforeSend: (event, hint) => {
        logging.error('Sending error to Sentry:');
        logging.error(event);
        logging.error(hint);
        return event;
      },
    });
    Sentry.configureScope(scope => {
      scope.setTag('lang', global.languageCode);
      scope.setTag('host', window.location.hostname);
    });
    logging.warn('Sentry error logging is enabled - this makes console errors less readable');
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
