import { displayModal, SET_BUSY, SET_ERROR, SET_MODAL } from '../shared';

function defaultState() {
  return {
    modalShown: false,
    projectName: '',
    targetFacility: null,
    token: '',
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_PROJECT_NAME(state, name) {
      state.projectName = name;
    },
    SET_TOKEN(state, token) {
      state.token = token;
    },
    SET_TARGET_FACILITY(state, facility) {
      state.targetFacility = facility;
    },
    SET_BUSY,
    SET_ERROR,
    SET_MODAL,
  },
  actions: {
    displayModal,
  },
};
