import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import ContentRenderer from './components/internal/ContentRenderer';
import initializeTheme from './styles/internal/initializeTheme';
import setupPluginMediator from './internal/pluginMediator';
import apiSpec from './internal/apiSpec';

/**
 * Object that forms the public API for the Kolibri
 * core app.
 */
const coreApp = {
  // Assign API spec
  ...apiSpec,
};

setupPluginMediator(coreApp);

// set up theme
initializeTheme();

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);

// - Installs helpers on Vue instances: $themeBrand, $themeTokens, $themePalette
// - Set up global state, listeners, and styles
// - Register KDS components
Vue.use(KThemePlugin);

Vue.component('ContentRenderer', ContentRenderer);

export default coreApp;
