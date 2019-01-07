import find from 'lodash/find';
import { CollectionKinds } from 'kolibri.coreVue.vuex.constants';

import { convertExamQuestionSourcesV0V1 } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
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
    examQuestions(state) {
      if (!state.exam.question_sources) {
        return [];
      }
      if (state.exam.data_model_version === 0) {
        const questionIds = {};
        state.exerciseContentNodes.forEach(node => {
          questionIds[node.id] = assessmentMetaDataState(node).assessmentIds;
        });
        return convertExamQuestionSourcesV0V1(
          state.exam.question_sources,
          state.exam.seed,
          questionIds
        );
      }
      return state.exam.question_sources;
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
