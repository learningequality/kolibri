import { getDifficultQuestions } from '../../utils';
import * as actions from './actions';

function defaultState() {
  return {
    itemStats: [],
    exercise: {},
    exam: {},
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    difficultQuestions(state) {
      return getDifficultQuestions(state.itemStats);
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
    SET_ITEMSTATS(state, itemStats) {
      state.itemStats = itemStats;
    },
  },
};
