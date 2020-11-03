import forEach from 'lodash/forEach';
import Vuex from 'vuex';
import Vue from 'vue';
import coreModule from './modules/core';

Vue.use(Vuex);

// Creates a new Vuex.Store instance with core components.
// If a Vuex module (pluginModule) is provided, it will register its components as well.
// This function is primarily used for to provide store fixtures in unit tests;
// similar code is in kolibri_app.js for bootstrapping plugin single-page apps.
export function coreStoreFactory(pluginModule) {
  // Core state is organized under `state.core`, but actions, getters, and mutations
  // are not namespaced.
  const store = new Vuex.Store();
  // Appends any pluginModule components to the store. `pluginModule.state`
  // is added to `state`. Actions, getters, and mutations cannot be namespaced.
  if (pluginModule) {
    store.hotUpdate({
      actions: pluginModule.actions || {},
      getters: pluginModule.getters || {},
      mutations: pluginModule.mutations || {},
    });

    if (typeof pluginModule.state !== 'function') {
      throw TypeError('pluginModule.state must be a function returning a state object');
    }
    store.replaceState(pluginModule.state());
    // Registers any modules defined in `pluginModule`. Their state objects will be organized
    // under `state.submoduleState`. Actions, getters, and mutations can be namespaced.
    forEach(pluginModule.modules, (module, name) => {
      store.registerModule(name, module);
    });
  }

  // Register core module last
  store.registerModule('core', coreModule);

  return store;
}

const store = coreStoreFactory();

export default store;
