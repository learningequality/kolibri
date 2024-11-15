/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */
import 'core-js';
import coreApp from 'kolibri';
import urls from 'kolibri/urls';
import logging from 'kolibri-logging';
import store from 'kolibri/store';
import heartbeat from 'kolibri/heartbeat';
import { i18nSetup } from 'kolibri/utils/i18n';
import coreModule from './state/modules/core';

// Do this before any async imports to ensure that public paths
// are set correctly
urls.setUp();
if (process.env.NODE_ENV === 'production') {
  /* eslint-disable no-undef */
  __webpack_public_path__ = urls.static(`${__kolibriModuleName}/`);
  /* eslint-enable */
}

// Shim window.location.origin for IE.
if (!window.location.origin) {
  window.location.origin = `${window.location.protocol}//${window.location.hostname}${
    window.location.port ? `:${window.location.port}` : ''
  }`;
}

// set up logging
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

// monitor page visibility
document.addEventListener('visibilitychange', function () {
  store.dispatch('setPageVisibility');
});

// Register core module
store.registerModule('core', coreModule);

// Start the heartbeat polling here, as any URL needs should be set by now
heartbeat.startPolling();

i18nSetup().then(coreApp.ready);

// This is exported by webpack as the kolibriCoreAppGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
export default coreApp;
