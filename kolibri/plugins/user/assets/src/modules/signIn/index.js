import { FacilityUserResource } from 'kolibri.resources';

export default {
  namespaced: true,
  state: {
    hasMultipleFacilities: null,
    // These users are retrieved for specified facilities
    usersForSelectedFacilities: [],
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.hasMultipleFacilities = null;
    },
    SET_SELECTED_FACILITY_USERS(state, payload) {
      state.usersForSelectedFacilities = payload;
    },
  },
  actions: {
    fetchUsersForFacilities(store, payload) {
      const getParams = { member_of: payload };

      FacilityUserResource.getListEndpoint('users_for_facilities', getParams)
        .then(response => {
          store.commit('SET_SELECTED_FACILITY_USERS', response.data);
        })
        .catch(e => {
          store.dispatch('handleApiError', e);
        });
    },
  },
};
