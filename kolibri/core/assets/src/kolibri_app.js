import forEach from 'lodash/forEach';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import heartbeat from 'kolibri.heartbeat';
import * as Sentry from '@sentry/browser';
import logger from 'kolibri.lib.logging';
import KolibriModule from 'kolibri_module';

export const logging = logger.getLogger(__filename);

if (global.sentryEnabled) {
  logging.warn('Sentry error logging is enabled - this disables all local error reporting!');
  logging.warn(
    '(see https://github.com/vuejs/vue/issues/8433 and https://docs.sentry.io/platforms/javascript/vue/)'
  );
  Sentry.init({
    dsn: `https://${global.sentryConfig.publicKey}@sentry.io/${global.sentryConfig.projectId}`,
    release: __version,
    integrations: [new Sentry.Integrations.Vue({ Vue })],
  });
}

/*
 * A class for single page apps that control routing and vuex state.
 * Override the routes, mutations, initialState, and RootVue getters.
 */
export default class KolibriApp extends KolibriModule {
  /*
   * @return {Array[Object]} Array of objects that define vue-router route configurations.
   *                         These will get passed to our internal router, so the handlers should
   *                         be functions that invoke vuex actions.
   */
  get routes() {
    return [];
  }

  get routerInstance() {
    return router.getInstance();
  }

  /*
   * @return {Object} A component definition for the root component of this single page app.
   */
  get RootVue() {
    return {};
  }
  /*
   * @return {Store} A convenience getter to return the vuex store.
   */
  get store() {
    return store;
  }
  /*
   * @return {Array[Function]} Array of vuex actions that will do initial state setting before the
   *                           routes are handled. Use this to do initial state setup that needs to
   *                           be dynamically determined, and done before every route in the app.
   *                           Each function should return a promise that resolves when the state
   *                           has been set. These will be invoked after the current session has
   *                           been set in the vuex store, in order to allow these actions to
   *                           reference getters that return data set by the getCurrentSession
   *                           action. As this has always been bootstrapped into the base template
   *                           this should not cause any real slow down in page loading.
   */
  get stateSetters() {
    return [];
  }

  // Vuex module for the plugin
  get pluginModule() {
    return {};
  }

  ready() {
    // Add the plugin-level mutations, getters, actions, but leave core module alone
    this.store.hotUpdate({
      actions: this.pluginModule.actions || {},
      getters: this.pluginModule.getters || {},
      mutations: this.pluginModule.mutations || {},
    });

    // Add the plugin state
    this.store.replaceState({
      ...this.store.state,
      ...this.pluginModule.state,
    });

    // Register plugin sub-modules
    forEach(this.pluginModule.modules, (module, name) => {
      store.registerModule(name, module);
    });

    return this.store.dispatch('getCurrentSession').then(() => {
      return Promise.all([
        // Invoke each of the state setters before initializing the app.
        ...this.stateSetters.map(setter => setter(this.store)),
      ]).then(() => {
        heartbeat.start();
        this.rootvue = new Vue(
          Object.assign(
            {
              el: 'rootvue',
              store: store,
              router: router.init(this.routes),
            },
            this.RootVue
          )
        );
      });
    });
  }
}
