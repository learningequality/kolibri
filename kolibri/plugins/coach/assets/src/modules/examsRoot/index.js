import { examState } from '../examShared/exams';

function defaultState() {
  return {
    busy: false,
    exams: [],
    examsModalSet: '',
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
    ADD_EXAM(state, newExam) {
      state.exams.push({ ...examState(newExam) });
    },
  },
};
