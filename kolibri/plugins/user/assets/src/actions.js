// const coreApp = require('kolibri');
// const logging = require('kolibri.lib.logging');

// const FacilityUserResource = coreApp.resources.FacilityUserResource;
// const TaskResource = coreApp.resources.TaskResource;

// const coreActions = require('kolibri.coreVue.vuex.actions');
// const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const constants = require('./state/constants');
const PageNames = constants.PageNames;
// const samePageCheckGenerator = require('kolibri.coreVue.vuex.actions').samePageCheckGenerator;


// ================================
// USER ACTIONS


/**
 * Actions
 *
 * These methods are used to update client-side state
 */

function showSignIn(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SIGN_IN);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Sign In');
}
function showSignUp(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SIGN_UP);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Sign Up');
}
function showProfile(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.PROFILE);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Profile');
}
function showScratchpad(store) {
  store.dispatch('SET_PAGE_NAME', PageNames.SCRATCHPAD);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Scratchpad');
}

module.exports = {
  showSignIn,
  showSignUp,
  showProfile,
  showScratchpad,
};
