import get from 'lodash/get';
import Modalities from 'kolibri-constants/Modalities';

function defaultState() {
  return {
    exercise: {},
    interactionIndex: 0,
    questionId: 0,
    tryIndex: 0,
  };
}

export default {
  namespaced: true,
  state: defaultState(),
  getters: {
    isQuiz(state) {
      return get(state.exercise, ['options', 'modality']) === Modalities.QUIZ;
    },
    isSurvey(state) {
      return get(state.exercise, ['options', 'modality']) === Modalities.SURVEY;
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
