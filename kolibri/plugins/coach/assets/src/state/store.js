const Vuex = require('kolibri.lib.vuex');
const coreStore = require('kolibri.coreVue.vuex.store');

const initialState = {
  pageName: '',
  pageState: {},
};

const mutations = {

  // coach-wide
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },
  SET_PAGE_NAME(state, pageName) {
    state.pageName = pageName;
  },

  // report
  SET_REPORT_SORTING(state, sortColumn, sortOrder) {
    state.pageState.sortColumn = sortColumn;
    state.pageState.sortOrder = sortOrder;
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
};

// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);

module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
