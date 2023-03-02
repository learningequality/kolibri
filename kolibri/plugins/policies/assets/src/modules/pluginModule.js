import policies from './policies';

export default {
  state() {
    return {
      pageName: '',
    };
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
  },
  modules: {
    policies,
  },
};
