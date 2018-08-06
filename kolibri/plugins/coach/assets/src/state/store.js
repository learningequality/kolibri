import Vue from 'kolibri.lib.vue';
import * as lessonsMutations from './mutations/lessonsMutations';

export const initialState = {
  pageName: '',
  pageState: {},
  classId: null,
  className: null,
  classList: [],
  classCoaches: [],
  currentClassroom: {},
  busy: false,
};

export const mutations = {
  // coach-wide
  ...lessonsMutations,
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_PAGE_NAME(state, pageName) {
    state.pageName = pageName;
  },
  SET_CLASS_INFO(state, { classId, classList, currentClassroom }) {
    state.currentClassroom = currentClassroom;
    state.classId = classId;
    state.className = currentClassroom ? currentClassroom.name : '';
    state.classCoaches = currentClassroom ? currentClassroom.coaches : [];
    state.classList = classList;
  },

  // report
  SET_REPORT_SORTING(state, sortColumn, sortOrder) {
    Vue.set(state.pageState, 'sortColumn', sortColumn);
    Vue.set(state.pageState, 'sortOrder', sortOrder);
  },
  SET_REPORT_PROPERTIES(state, options) {
    Vue.set(state.pageState, 'channelId', options.channelId);
    Vue.set(state.pageState, 'contentScope', options.contentScope);
    Vue.set(state.pageState, 'contentScopeId', options.contentScopeId);
    Vue.set(state.pageState, 'userScope', options.userScope);
    Vue.set(state.pageState, 'userScopeId', options.userScopeId);
    Vue.set(state.pageState, 'userScopeName', options.userScopeName);
    Vue.set(state.pageState, 'viewBy', options.viewBy);
    Vue.set(state.pageState, 'showRecentOnly', options.showRecentOnly);
  },
  SET_REPORT_TABLE_DATA(state, tableData) {
    Vue.set(state.pageState, 'tableData', tableData);
  },
  SET_REPORT_CONTENT_SUMMARY(state, summary) {
    Vue.set(state.pageState, 'contentScopeSummary', summary);
  },
  SET_REPORT_USER_SUMMARY(state, summary) {
    Vue.set(state.pageState, 'userScopeSummary', summary);
  },

  // groups
  SET_GROUP_MODAL(state, modalName) {
    state.pageState.groupModalShown = modalName;
  },
  SET_GROUPS(state, groups) {
    state.pageState.groups = groups;
  },

  SET_TOPIC(state, topic) {
    state.pageState.topic = topic;
  },

  SET_SUBTOPICS(state, subtopics) {
    state.pageState.subtopics = subtopics;
  },

  SET_EXERCISES(state, exercises) {
    state.pageState.exercises = exercises;
  },
  SET_SELECTED_EXERCISES(state, selectedExercises) {
    state.pageState.selectedExercises = selectedExercises;
    state.pageState.exerciseContentNodes = state.pageState.exerciseContentNodes.concat(
      selectedExercises
    );
  },
  SET_AVAILABLE_QUESTIONS(state, availableQuestions) {
    Vue.set(state.pageState, 'availableQuestions', availableQuestions);
  },
  SET_EXAMS(state, exams) {
    state.pageState.exams = exams;
  },
  SET_EXAMS_MODAL(state, modalName) {
    state.pageState.examsModalSet = modalName;
  },
  // etc
  SET_SELECTED_ATTEMPT_LOG_INDEX(state, attemptLog) {
    state.pageState.selectedAttemptLogIndex = attemptLog;
  },

  SET_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
  SET_TOOLBAR_TITLE(state, title) {
    state.pageState.toolbarTitle = title;
  },
  SET_EXAM_STATUS(state, payload) {
    const { examId, isActive } = payload;
    const exams = [...state.pageState.exams];
    const examIndex = exams.findIndex(exam => exam.id === examId);
    exams[examIndex].active = isActive;
    state.pageState.exams = exams;
  },
};
