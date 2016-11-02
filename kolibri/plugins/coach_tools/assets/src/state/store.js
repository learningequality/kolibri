const Vuex = require('vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: 'COACH_ROOT',
};

const mutations = {
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
