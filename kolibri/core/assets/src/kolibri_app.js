import { sync } from 'vuex-router-sync';
import forEach from 'lodash/forEach';
import router from 'kolibri.coreVue.router';
import logger from 'kolibri.lib.logging';
import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import heartbeat from 'kolibri.heartbeat';
import KolibriModule from 'kolibri_module';

export const logging = logger.getLogger(__filename);

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

  /*
   * @return {Object} A component definition for the root component of this single page app.
   */
  get RootVue() {
    // By default return the component that just renders router-view,
    // which will render the component for the current route.
    return {
      functional: true,
      render: createElement => createElement('router-view'),
    };
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
   *                           reference getters that return data set by the heartbeat.
   */
  get stateSetters() {
    return [];
  }

  // Vuex module for the plugin
  get pluginModule() {
    return {};
  }

  setupVue() {
    // VueRouter instance needs to be defined to use vuex-router-sync
    if (!router._vueRouter) {
      router.initRouter();
    }
    sync(store, router);

    // Add the plugin-level mutations, getters, actions, but leave core module alone
    this.store.hotUpdate({
      actions: this.pluginModule.actions || {},
      getters: this.pluginModule.getters || {},
      mutations: this.pluginModule.mutations || {},
    });

    if (typeof this.pluginModule.state !== 'function') {
      throw TypeError('pluginModule.state must be a function returning a state object');
    }

    // Add the plugin state to the initial core module state
    this.store.replaceState({
      ...this.store.state,
      ...this.pluginModule.state(),
    });

    // Register plugin sub-modules
    forEach(this.pluginModule.modules, (module, name) => {
      store.registerModule(name, module);
    });
  }

  startRootVue() {
    this.rootvue = new Vue(
      Object.assign(
        {
          el: 'rootvue',
          store: store,
          router: router.initRoutes(this.routes),
        },
        this.RootVue,
      ),
    );
  }

  ready() {
    this.setupVue();
    return heartbeat.startPolling().then(() => {
      return Promise.all([
        // Invoke each of the state setters before initializing the app.
        ...this.stateSetters.map(setter => setter(this.store)),
      ]).then(() => {
        this.startRootVue();
      });
    });
  }
}
