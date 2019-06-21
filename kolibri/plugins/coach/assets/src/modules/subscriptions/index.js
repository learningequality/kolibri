import * as actions from './actions';

function defaultState() {
  return {
    subscriptionModalShown: '',
    selectedSubscriptions: '[]',
    selectedGroupSubscriptions: '[]',
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    SET_SUBSCRIPTIONS(state, subscriptions) {
      state.selectedSubscriptions = subscriptions;
    },
    SET_GROUP_SUBSCRIPTIONS(state, subscriptions) {
      state.selectedGroupSubscriptions = subscriptions;
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_SUBSCRIPTION_MODAL(state, modalName) {
      state.subscriptionModalShown = modalName;
    },
  },
  getters: {
    getSubs(state) {
      return state.selectedSubscriptions;
    },
  },
  actions,
};
