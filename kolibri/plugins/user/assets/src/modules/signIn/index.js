export default {
  namespaced: true,
  state: {
    username: '',
    password: '',
    hasMultipleFacilities: null,
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.hasMultipleFacilities = null;
    },
    RESET_FORM_VALUES(state) {
      state.username = '';
      state.password = '';
    },
    SET_USERNAME(state, payload) {
      state.username = payload;
    },
    SET_PASSWORD(state, payload) {
      state.password = payload;
    },
  },
};
