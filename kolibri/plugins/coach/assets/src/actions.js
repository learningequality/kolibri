const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const router = require('kolibri.coreVue.router');

const ClassroomResource = coreApp.resources.ClassroomResource;
const ChannelResource = coreApp.resources.ChannelResource;
const FacilityUserResource = coreApp.resources.FacilityUserResource;
const Constants = require('./state/constants');

const logging = require('kolibri.lib.logging');
const values = require('lodash.values');


/* find the keys that differ between the old and new params */
function _diffKeys(newParams, oldParams) {
  if (!oldParams) {
    return Object.keys(newParams);
  }
  const diffKeys = [];
  Object.entries(newParams).forEach(([key, value]) => {
    if (oldParams[key] !== value) {
      diffKeys.push(key);
    }
  });
  return diffKeys;
}

/**
 * Title Helper
 */

function _managePageTitle(title) {
  return `Manage ${title}`;
}


// ================================
// CLASS LIST ACTIONS

function showClassListPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_CLASS_LIST_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// RECENT ACTIONS

function showRecentPage(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_RECENT_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// TOPICS ACTIONS

function showTopicsPage(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_TOPICS_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// EXAMS ACTIONS

function showExamsPage(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_EXAMS_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// LEARNERS ACTIONS

function showLearnersPage(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_LEARNERS_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}


// ================================
// GROUPS ACTIONS

function showGroupsPage(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_GROUPS_PAGE);
  const classCollection = ClassroomResource.getCollection();
  classCollection.fetch().then(
    (classes) => {
      const pageState = {
        // classes: classes.map(_classState),
        classes,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', _managePageTitle('Coach'));
    },
    error => { coreActions.handleApiError(store, error); }
  );
}

module.exports = {
  showClassListPage,
  showRecentPage,
  showTopicsPage,
  showExamsPage,
  showLearnersPage,
  showGroupsPage,
};
