export default {
  namespaced: true,
  state: {
    shortcutNodes: [],
    rootNodes: []
  },
  mutations: {
    SET_STATE(state, payload) {
      state.shortcutNodes = payload.shortcutNodes;
      state.rootNodes = payload.rootNodes;
    },
    RESET_STATE(state) {
      state.shortcutNodes = [];
      state.rootNodes = [];
    },
  },
};
