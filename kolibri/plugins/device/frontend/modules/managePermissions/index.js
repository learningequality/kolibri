function defaultState() {
  return {
    loadingFacilityUsers: false,
    facilityUsers: [],
    permissions: {},
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
    SET_LOADING_FACILITY_USERS(state, loadingFacilityUsers) {
      state.loadingFacilityUsers = loadingFacilityUsers;
    },
  },
};
