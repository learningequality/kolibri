import Vue from 'vue';
import Vuex, { Store } from 'vuex';

Vue.use(Vuex);

/**
 * Build a plugin's store from its module definition. Importing this module is what
 * installs Vuex on Vue.
 *
 * Vuex is deprecated in Kolibri — this exists only so that the plugins which still have a
 * store can own it themselves. Do not create new stores with it.
 * @param {object} storeOptions - The plugin's module definition.
 * @returns {Store} The plugin's store.
 */
export default function createStore(storeOptions) {
  return new Store(storeOptions);
}
