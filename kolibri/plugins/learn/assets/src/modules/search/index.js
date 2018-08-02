import * as actions from './actions';

export default {
  namespaced: true,
  state: {
    content: [],
    contents: [],
    searchTerm: '',
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.content = [];
      state.contents = [];
      state.searchTerm = '';
    },
    SET_SEARCH_TERM(state, searchTerm) {
      state.searchTerm = searchTerm;
    },
    SET_CONTENT(state, content) {
      state.content = content;
    },
  },
  actions,
};
