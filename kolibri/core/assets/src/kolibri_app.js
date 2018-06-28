import { getCurrentSession } from 'kolibri.coreVue.vuex.actions';
import router from 'kolibri.coreVue.router';
import Vue from 'kolibri.lib.vue';
import store from 'kolibri.coreVue.vuex.store';
import heartbeat from 'kolibri.heartbeat';
import KolibriModule from 'kolibri_module';

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
   * @return {Object} An object of vuex mutations, with keys as the mutation name, and
   *                  values that are methods that perform the store mutation.
   */
  get mutations() {
    return {};
  }
  /*
   * @return {Object} The initial state of the vuex store for this app, this will be merged with
   *                  the core app initial state to instantiate the store.
   */
  get initialState() {
    return {};
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
  ready() {
    this.store.registerModule({
      state: this.initialState,
      mutations: this.mutations,
    });
    return getCurrentSession(store).then(() => {
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
