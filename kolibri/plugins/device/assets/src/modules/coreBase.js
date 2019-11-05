export default {
  namespaced: true,
  state: {
    appBarTitle: '',
    query: {},
  },
  mutations: {
    SET_APP_BAR_TITLE(state, appBarTitle) {
      state.appBarTitle = appBarTitle;
    },
    SET_QUERY(state, query) {
      state.query = query;
    },
  },
};
