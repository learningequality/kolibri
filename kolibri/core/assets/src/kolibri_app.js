import forEach from 'lodash/forEach';
import isPlainObject from 'lodash/isPlainObject';
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
   *                           reference getters that return data set by the heartbeat.
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

    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-inner-declarations */
      // Register any schemas we have defined for vuex state
      function registerSchema(schema, moduleName, subPaths = []) {
        forEach(schema, (subSchema, propertyName) => {
          // Must be a plain object to be a valid schema spec
          // And have at least a default key, and one of type or validator
          if (isPlainObject(subSchema)) {
            if (
              typeof subSchema.default !== 'undefined' &&
              (subSchema.type || (subSchema.validator && subSchema.validator instanceof Function))
            ) {
              function getter(state) {
                if (moduleName) {
                  state = state[moduleName];
                }
                subPaths.forEach(path => {
                  state = state[path];
                });
                return state[propertyName];
              }
              function callback(newValue) {
                let fail = false;
                if (subSchema.type) {
                  if (subSchema.type === Object) {
                    if (!isPlainObject(newValue)) {
                      fail = true;
                    }
                  } else {
                    fail = !(newValue instanceof subSchema.type);
                  }
                }
                if (subSchema.validator) {
                  if (!subSchema.validator(newValue)) {
                    fail = true;
                  }
                }
                if (fail) {
                  logging.error(
                    `Validation failed for property: ${[...subPaths, propertyName]} in module ${
                      moduleName ? moduleName : 'root'
                    }`
                  );
                }
              }
              store.watch(getter, callback);
            } else {
              // Otherwise assume it is just a nested object structure
              registerSchema(subSchema, moduleName, [...subPaths, propertyName]);
            }
          }
        });
      }
      if (this.pluginModule.state && this.pluginModule.state.schema) {
        registerSchema(this.pluginModule.state.schema);
      }
      forEach(this.pluginModule.modules, (module, name) => {
        if (module.schema) {
          registerSchema(module.schema, name);
        }
      });
      /* eslint-enable */
    }

    heartbeat.startPolling().then(() => {
      this.store.dispatch('getNotifications');
      return Promise.all([
        // Invoke each of the state setters before initializing the app.
        ...this.stateSetters.map(setter => setter(this.store)),
      ]).then(() => {
        this.rootvue = new Vue(
          Object.assign(
            {
              el: 'rootvue',
              store: store,
              router: router.initRoutes(this.routes),
            },
            this.RootVue
          )
        );
      });
    });
  }
}
