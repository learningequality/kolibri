// const coreApp = require('kolibri');
// const logging = require('kolibri.lib.logging');

// const FacilityUserResource = coreApp.resources.FacilityUserResource;
// const TaskResource = coreApp.resources.TaskResource;

// const coreActions = require('kolibri.coreVue.vuex.actions');
// const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const constants = require('./state/constants');
const PageNames = constants.PageNames;
// const samePageCheckGenerator = require('kolibri.coreVue.vuex.actions').samePageCheckGenerator;
const SignUpResource = require('kolibri').resources.SignUpResource;
const coreActions = require('kolibri.coreVue.vuex.actions');
// const router = require('kolibri.coreVue.router');

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


function signUp(store, signUpCreds) {
  const signUpModel = SignUpResource.createModel(signUpCreds);
  const signUpPromise = signUpModel.save(signUpCreds);
  signUpPromise.then(() => {
    store.dispatch('CORE_SET_SIGN_UP_ERROR', null);
    // TODO: Use router.
    window.location.href = 'http://127.0.0.1:8000';
  }).catch(error => {
    if (error.status.code === 400) {
      store.dispatch('CORE_SET_SIGN_UP_ERROR', 400);
    } else {
      coreActions.handleApiError(store, error);
    }
  });
}

module.exports = {
  showSignIn,
  showSignUp,
  showProfile,
  signUp,
};
