/**
 * Provides the public API for the Kolibri FrontEnd core app.
 * @module Facade
 */
import 'core-js';
import urls from 'kolibri.urls';
import logging from 'kolibri.lib.logging';
import store from 'kolibri.coreVue.vuex.store';
import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import VueCompositionApi from '@vue/composition-api';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import heartbeat from 'kolibri.heartbeat';
import KContentPlugin from 'kolibri-design-system/lib/content/KContentPlugin';
import initializeTheme from '../styles/initializeTheme';
import { i18nSetup, languageDirection } from '../utils/i18n';
import ContentRendererErrorComponent from '../views/ContentRenderer/ContentRendererError';
import apiSpec from './apiSpec';

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
initializeTheme();

// monitor page visibility
document.addEventListener('visibilitychange', function() {
  store.dispatch('setPageVisibility');
});

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(VueCompositionApi);

// - Installs helpers on Vue instances: $themeBrand, $themeTokens, $themePalette
// - Set up global state, listeners, and styles
// - Register KDS components
Vue.use(KThemePlugin);

Vue.use(KContentPlugin, {
  languageDirection,
  ContentRendererErrorComponent,
  coreApp,
  registerContentActivity: heartbeat.setActive,
});

// Register the Progressive Web App (PWA) service worker, if supported by the
// browser.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(serviceWorker => {
      console.log("Service Worker registered: ", serviceWorker);
    })
    .catch(error => {
      console.error("Error registering the Service Worker: ", error);
    });
}


// Start the heartbeat polling here, as any URL needs should be set by now
heartbeat.startPolling();

i18nSetup().then(coreApp.ready);

// This is exported by webpack as the kolibriCoreAppGlobal object, due to the 'output.library' flag
// which exports the coreApp at the bottom of this file as a named global variable:
// https://webpack.github.io/docs/configuration.html#output-library
export default coreApp;
