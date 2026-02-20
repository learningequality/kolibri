import { SET_MODAL } from '../shared';
import { assignCoachesToClass, enrollLearnersInClass } from './actions';

function defaultState() {
  return {
    class: {},
    facilityUsers: [],
    totalPageNumber: 0,
    totalLearners: 0,
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
    SET_MODAL,
  },
  actions: {
    assignCoachesToClass,
    enrollLearnersInClass,
  },
};
