export default {
  state() {
    return {
      test: '',
    };
  },
  actions: {
    reset(store) {
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    resetModuleState(store) {
      store.commit('profile/RESET_STATE');
    },
  },
  mutations: {
    SET_Test(state, test) {
      state.test = test;
    },
  },
};
