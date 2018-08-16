import * as actions from './actions';

function defaultState() {
  return {
    classUsers: [],
    groupModalShown: '',
    groups: [],
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
    SET_GROUP_MODAL(state, modalName) {
      state.groupModalShown = modalName;
    },
    SET_GROUPS(state, groups) {
      state.groups = groups;
    },
  },
  actions,
};
