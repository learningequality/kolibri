import Vue from 'kolibri.lib.vue';
import { displayModal, SET_ERROR, SET_MODAL, SET_BUSY } from '../shared';
import * as userManagementActions from './actions';

function defaultState() {
  return {
    error: '',
    facilityUsers: [],
    isBusy: false,
    modalShown: false,
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
    SET_ERROR,
    SET_MODAL,
    SET_BUSY,
    ADD_USER(state, user) {
      state.facilityUsers.push(user);
    },
    DELETE_USER(state, id) {
      state.facilityUsers = state.facilityUsers.filter(user => user.id !== id);
    },
    UPDATE_USER(state, updatedUser) {
      const match = state.facilityUsers.find(user => user.id === updatedUser.id);
      if (match) {
        Vue.set(match, 'username', updatedUser.username);
        Vue.set(match, 'full_name', updatedUser.full_name);
        Vue.set(match, 'kind', updatedUser.kind);
        Vue.set(match, 'roles', [...updatedUser.roles]);
      }
    },
  },
  actions: Object.assign(
    {
      displayModal,
    },
    userManagementActions
  ),
};
