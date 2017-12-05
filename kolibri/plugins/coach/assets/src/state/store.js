import Vue from 'kolibri.lib.vue';

export const initialState = {
  pageName: '',
  pageState: {},
  classId: null,
  classList: [],
  busy: false,
};

export const mutations = {
  // coach-wide
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_PAGE_NAME(state, pageName) {
    state.pageName = pageName;
  },
  SET_CLASS_INFO(state, classId, classList) {
    state.classId = classId;
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
  },
  SET_EXAMS(state, exams) {
    state.pageState.exams = exams;
  },
  SET_EXAM_MODAL(state, modalName) {
    state.pageState.examModalShown = modalName;
  },
  // etc
  SET_SELETED_ATTEMPTLOG_INDEX(state, attemptLog) {
    state.pageState.selectedAttemptLogIndex = attemptLog;
  },

  SET_BUSY(state, isBusy) {
    state.pageState.busy = isBusy;
  },
};
