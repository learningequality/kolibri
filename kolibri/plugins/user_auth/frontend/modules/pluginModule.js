export default {
  state() {
    return {
      pageName: '',
      appBarTitle: '',
    };
  },
  mutations: {
    SET_PAGE_NAME(state, name) {
      state.pageName = name;
    },
  },
};
