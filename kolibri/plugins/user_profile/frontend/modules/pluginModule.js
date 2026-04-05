import { clearError } from 'kolibri/utils/appError';
import profile from './profile';

export default {
  state() {
    return {
      pageName: '',
    };
  },
  actions: {
    reset() {
      clearError();
    },
    resetModuleState(store) {
      store.commit('profile/RESET_STATE');
    },
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
  },
  modules: {
    profile,
  },
};
