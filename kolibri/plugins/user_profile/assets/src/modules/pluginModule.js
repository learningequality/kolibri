import profile from './profile';

export default {
  state() {
    return {
      pageName: '',
      appBarTitle: '',
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
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
    SET_APPBAR_TITLE(state, appBarTitle) {
      state.appBarTitle = appBarTitle;
    },
  },
  modules: {
    profile,
  },
};
