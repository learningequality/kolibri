const coreApp = require('kolibri');
// const logging = require('kolibri.lib.logging');

const FacilityUserResource = coreApp.resources.FacilityUserResource;

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

function editProfile(store, profileEdits, session) {
  // payload needs username, fullname, and facility
  const userID = profileEdits.id;
  const savedUserModel = FacilityUserResource.getModel(userID);
  const savedUser = savedUserModel.attributes;
  const changedValues = {};

  // TODO set up core session updates

  // explicit checks for the only values that can be changed
  if (profileEdits.full_name && profileEdits.full_name !== savedUser.full_name) {
    changedValues.full_name = profileEdits.full_name;
  }
  if (profileEdits.username && profileEdits.username !== savedUser.username) {
    changedValues.username = profileEdits.username;
  }
  if (profileEdits.password && profileEdits.password !== savedUser.password) {
    changedValues.password = profileEdits.password;
  }
  if (profileEdits.facility && profileEdits.facility !== savedUser.facility) {
    changedValues.facility = profileEdits.facility;
  }

  // update user object with new values
  store.dispatch('SET_PROFILE_BUSY', true);

  savedUserModel.save(changedValues).then(userWithAttrs => {
    // dispatch changes to store
    store.dispatch('SET_PROFILE_STATUS', 'Successful');
    store.dispatch('SET_PROFILE_BUSY', false);
  }, error => {
    store.dispatch('SET_PROFILE_EROR', true);
    // error.message doesn't exist. TODO
    store.dispatch('SET_PROFILE_STATUS', error.message);
  });
}
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
  const pageState = {
    busy: false,
    statusMessage: '',
    error: false,
  };
  store.dispatch('SET_PAGE_NAME', PageNames.PROFILE);
  store.dispatch('SET_PAGE_STATE', pageState);
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
  editProfile,
  showScratchpad,
};
