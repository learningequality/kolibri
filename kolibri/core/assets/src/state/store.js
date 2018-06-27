import forEach from 'lodash/forEach';
import Vuex from 'vuex';
import Vue from 'vue';
import coreModule from './modules/core';

Vue.use(Vuex);

export function coreStoreFactory(pluginModule) {
  const store = new Vuex.Store({
    modules: {
      core: coreModule,
    },
  });
  if (pluginModule) {
    store.hotUpdate({
      actions: pluginModule.actions || {},
      getters: pluginModule.getters || {},
      mutations: pluginModule.mutations || {},
    });
    store.replaceState({
      core: { ...coreModule.state },
      ...(pluginModule.state || {}),
    });
    forEach(pluginModule.modules, (module, name) => {
      store.registerModule(name, module);
    });
  }
  return store;
}

const store = coreStoreFactory();

export default store;
