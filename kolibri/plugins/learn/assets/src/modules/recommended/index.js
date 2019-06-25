import Vue from 'kolibri.lib.vue';

export default {
  namespaced: true,
  state: {
    nextSteps: [],
    popular: [],
    resume: [],
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      state.nextSteps = [];
      state.popular = [];
      state.resume = [];
    },
    SET_RECOMMENDED_NODES_PROGRESS(state, progressArray) {
      ['nextSteps', 'popular', 'resume'].forEach(function(key) {
        progressArray.forEach(progress => {
          const contentNode = state[key].find(node => node.id === progress.id);
          if (contentNode) {
            Vue.set(contentNode, 'progress', progress.progress_fraction);
          }
        });
      });
    },
  },
  modules: {
    subpage: {
      namespaced: true,
      state: {
        recommendations: [],
      },
      mutations: {
        SET_STATE(state, payload) {
          state.recommendations = payload.recommendations;
        },
        RESET_STATE(state) {
          state.recommendations = [];
        },
      },
    },
  },
};
