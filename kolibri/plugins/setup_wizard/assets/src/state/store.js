
const Vuex = require('vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {};
const mutations = {};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
