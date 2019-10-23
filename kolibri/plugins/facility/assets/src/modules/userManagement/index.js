import * as userManagementActions from './actions';

function defaultState() {
  return {
    facilityUsers: [],
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
    DELETE_USER(state, id) {
      state.facilityUsers = state.facilityUsers.filter(user => user.id !== id);
    },
  },
  actions: userManagementActions,
};
