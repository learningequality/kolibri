import Vuex from 'kolibri.lib.vuex';
import {
  initialState as coreInitialState,
  mutations as coreMutations,
} from 'kolibri.coreVue.vuex.store';

const initialState = {
  pageState: {
    submitted: false,
  },
};
const mutations = {
  SET_SUBMITTED_STATE(state, submittedFlag) {
    state.pageState.submitted = submittedFlag;
  },
};

// assigns core state and mutations
Object.assign(initialState, coreInitialState);
Object.assign(mutations, coreMutations);

const store = new Vuex.Store({
  state: initialState,
  mutations,
});

export default store;
