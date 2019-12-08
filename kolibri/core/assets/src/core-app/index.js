/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */
// polyfill for older browsers
// TODO: rtibbles whittle down these polyfills to only what is needed for the application
import 'core-js';
// Required to setup Keen UI, should be imported only once in your project
import 'keen-ui/src/bootstrap';
import '../keen-config/font-stack.scss';
import '../styles/main.scss';
import urls from 'kolibri.urls';
import * as theme from 'kolibri-components/src/styles/theme';
import generateGlobalStyles from 'kolibri-components/src/styles/generateGlobalStyles';
import trackInputModality from 'kolibri-components/src/styles/trackInputModality';
import trackMediaType from 'kolibri-components/src/styles/trackMediaType';
import keenUiConfig from 'keen-ui/src/config';
import branding from 'kolibri.utils.branding';
import logging from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import KThemePlugin from 'kolibri-components/src/KThemePlugin';
import heartbeat from 'kolibri.heartbeat';
import KContentPlugin from 'kolibri-components/src/content/KContentPlugin';
import keenOptions from '../keen-config/options.json';
import { i18nSetup, languageDirection } from '../utils/i18n';
import ContentRendererErrorComponent from '../views/ContentRenderer/ContentRendererError';
import apiSpec from './apiSpec';
import plugin_data from 'plugin_data';
// Do this before any async imports to ensure that public paths
// are set correctly
urls.setUp();

// Shim window.location.origin for IE.
if (!window.location.origin) {
  window.location.origin = `${window.location.protocol}//${window.location.hostname}${
    window.location.port ? `:${window.location.port}` : ''
  }`;
}

// set up logging
logging.setDefaultLevel(process.env.NODE_ENV === 'production' ? 2 : 0);

/**
 * Object that forms the public API for the Kolibri
 * core app.
 */
const coreApp = {
  // Assign API spec
  ...apiSpec,
  version: __version,
};

// set up theme
const kolibriTheme = plugin_data.kolibriTheme;

theme.setBrandColors(kolibriTheme.brandColors);
theme.setTokenMapping(kolibriTheme.tokenMapping);
// set up branding
branding.setBranding(kolibriTheme);

// configure Keen
keenUiConfig.set(keenOptions);

// global styles
generateGlobalStyles();

// monitor input modality
trackInputModality();

// monitor media type, "print" vs "screen"
trackMediaType();

// monitor page visibility
document.addEventListener('visibilitychange', function() {
  store.dispatch('setPageVisibility');
});

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(KThemePlugin);

Vue.use(KContentPlugin, {
  languageDirection,
  ContentRendererErrorComponent,
  coreApp,
  registerContentActivity: heartbeat.setActive,
});

// Start the heartbeat polling here, as any URL needs should be set by now
heartbeat.startPolling();

i18nSetup().then(coreApp.ready);

// This is exported by webpack as the kolibriCoreAppGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
export default coreApp;
