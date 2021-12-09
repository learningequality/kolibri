import get from 'lodash/get';
import Modalities from 'kolibri-constants/Modalities';

function defaultState() {
  return {
    resource: {},
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    isQuiz(state) {
      return get(state.resource, ['options', 'modality']) === Modalities.QUIZ;
    },
  },
  mutations: {
    SET_STATE(state, payload) {
      Object.assign(state, payload);
    },
    RESET_STATE(state) {
      Object.assign(state, defaultState());
    },
  },
};
