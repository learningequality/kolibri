import * as actions from './actions';

function defaultState() {
  return {
    itemStats: [],
    exercise: {},
    exam: {},
  };
}

function ratio(stat) {
  return stat.correct / stat.total;
}

export default {
  namespaced: true,
  state: defaultState(),
  actions,
  getters: {
    difficultQuestions(state) {
      return state.itemStats
        .filter(stat => {
          // Arbitrarily filter out questions that have higher than 80% correct rate
          return stat.correct / stat.total < 0.8;
        })
        .sort((stat1, stat2) => {
          // Sort first by raw correct
          if (ratio(stat1) > ratio(stat2)) {
            return 1;
          } else if (ratio(stat2) > ratio(stat1)) {
            return -1;
            // If they are equal, prioritize questions in which we have the highest
            // number of answers
          } else if (stat1.total > stat2.total) {
            return -1;
          } else if (stat2.total > stat1.total) {
            return 1;
          }
          // Nothing between them!
          return 0;
        });
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
