import Vuex from 'kolibri.lib.vuex';
import * as coreStore from 'kolibri.coreVue.vuex.store';

const initialState = {};
const mutations = {};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);

const store = new Vuex.Store({
  state: initialState,
  mutations,
});

export { store as default };
