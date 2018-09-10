import * as actions from './actions';

function defaultState() {
  return {
    exam: {},
    examTakers: [],
    exams: [],
    examsModalSet: '',
    exerciseContentNodes: [],
    learnerGroups: [],
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
    SET_EXAMS_MODAL(state, modalName) {
      state.examsModalSet = modalName;
    },
    SET_EXAM_STATUS(state, payload) {
      const { examId, isActive } = payload;
      const exams = [...state.exams];
      const examIndex = exams.findIndex(exam => exam.id === examId);
      exams[examIndex].active = isActive;
      state.exams = exams;
    },
    SET_EXAMS(state, exams) {
      state.exams = exams;
    },
    SET_EXAM_REPORT_TABLE_DATA(state, examTakers) {
      state.examTakers = [...examTakers];
    },
  },
  actions,
};
