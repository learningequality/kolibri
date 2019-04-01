import sortBy from 'lodash/sortBy';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import * as actions from './actions';

function defaultState() {
  return {
    learnerMap: {},
    exercise: {},
    exam: null,
    interactionIndex: 0,
    learnerId: null,
    questionId: null,
    title: '',
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    learners(state) {
      return sortBy(Object.values(state.learnerMap), 'name');
    },
    learnerIndex(state, getters) {
      return getters.learners.findIndex(learner => learner.id === state.learnerId) || 0;
    },
    currentLearner(state) {
      return state.learnerMap[state.learnerId] || {};
    },
    currentInteraction(state, getters) {
      return getters.currentInteractionHistory[state.interactionIndex];
    },
    currentInteractionHistory(state, getters) {
      let history = getters.currentLearner.interaction_history || [];
      // filter out errors
      history = history.filter(interaction => interaction.type !== 'error');
      return history;
    },
    kind(state) {
      return state.exam ? ContentNodeKinds.EXAM : ContentNodeKinds.EXERCISE;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_LEARNERS(state, learners) {
      const learnerMap = {};
      learners.forEach(learner => {
        learnerMap[learner.id] = learner;
      });
      state.learnerMap = learnerMap;
    },
  },
};
