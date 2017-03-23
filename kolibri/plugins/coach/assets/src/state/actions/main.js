
const Constants = require('../../constants');
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreApp = require('kolibri');

const ClassroomResource = coreApp.resources.ClassroomResource;
const AttemptLogResource = coreApp.resources.AttemptLog;

/**
 * Title Helper
 */

function _coachPageTitle(title) {
  return `Coach ${title}`;
}


// ================================
// CLASS LIST ACTIONS

function showClassListPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CLASS_LIST);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _coachPageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// EXAMS ACTIONS

function showExamsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXAMS);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        classId,
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _coachPageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// - - - - - Action for Coach Exercise Render Page - - - - - -

function _daysElapsed(startTime, endTime) {
  // one day = 24*60*60*1000 = 86400000
  return (Date.UTC(startTime.getYear(), startTime.getMonth(), startTime.getDate()) -
    Date.UTC(endTime.getYear(), endTime.getMonth(), endTime.getDate())) / 86400000;
}

function showCoachExerciseRenderPage(store, userId, contentId) {
  const reversedAttemptLogs = [];
  const today = new Date();
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.EXERCISE_RENDER);
  AttemptLogResource.getCollection({
    user: userId, content: contentId
  }).fetch().then(
    attemptLogs => {
      attemptLogs.forEach((attemptLog) => {
        attemptLog.daysElapsed = _daysElapsed(today, new Date(attemptLog.end_timestamp));
        // use unshift because the original array is in reversed order.
        reversedAttemptLogs.unshift(attemptLog);
      });
      const pageState = {
        attemptLogs: reversedAttemptLogs,
        selectedAttemptLogIndex: 0,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_TITLE', _coachPageTitle('Exercise Detail View'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}

function setSelectedAttemptLogIndex(store, index) {
  store.dispatch('SET_SELETED_ATTEMPTLOG_INDEX', index);
}


module.exports = {
  showClassListPage,
  showExamsPage,
  showCoachExerciseRenderPage,
  setSelectedAttemptLogIndex,
};
