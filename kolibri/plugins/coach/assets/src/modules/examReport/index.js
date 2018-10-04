import find from 'lodash/find';
import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';
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
  getters: {
    learnerIsExamAssignee(state) {
      const { assignments } = state.exam;
      return function isAssigned(learner) {
        // If assigned to whole class, then true
        if (
          assignments.length === 1 &&
          assignments[0].collection_kind === CollectionKinds.CLASSROOM
        ) {
          return true;
        }
        // Otherwise check to see if learner is in a group
        if (learner.group.id) {
          return Boolean(find(assignments, { collection: learner.group.id }));
        } else {
          return false;
        }
      };
    },
  },
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
    SET_EXAM(state, exam) {
      state.exam = { ...exam };
    },
    SET_EXAM_REPORT_TABLE_DATA(state, examTakers) {
      state.examTakers = [...examTakers];
    },
  },
  actions,
};
