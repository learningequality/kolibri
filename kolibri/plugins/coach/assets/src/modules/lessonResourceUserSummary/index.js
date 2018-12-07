import * as actions from './actions';

function defaultState() {
  return {
    channelTitle: '',
    contentNode: {},
    resourceKind: '',
    resourceTitle: '',
    userData: [],
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_USER_DATA(state, userData) {
      state.userData = [...userData];
    },
  },
};
