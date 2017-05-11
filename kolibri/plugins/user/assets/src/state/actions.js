const coreApp = require('kolibri');
const PageNames = require('../constants').PageNames;
const SignUpResource = require('kolibri').resources.SignUpResource;
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreGetters = require('kolibri.coreVue.vuex.getters');
const router = require('kolibri.coreVue.router');

const FacilityUserResource = coreApp.resources.FacilityUserResource;
const DeviceOwnerResource = coreApp.resources.DeviceOwnerResource;

function redirectToHome() {
  window.location = '/';
}

function showRoot(store) {
  const userSignedIn = coreGetters.isUserLoggedIn(store.state);
  if (userSignedIn) {
    router.getInstance().replace({
      name: PageNames.PROFILE,
    });
    return;
  }
  router.getInstance().replace({
    name: PageNames.SIGN_IN,
  });
}

function editProfile(store, edits, session) {
  // payload needs username, fullname, and facility
  // used to save changes to API
  function getUserModel() {
    if (coreGetters.isAdmin) {
      return DeviceOwnerResource.getModel(session.user_id);
    }
    return FacilityUserResource.getModel(session.user_id);
  }
  const savedUserModel = getUserModel();
  const changedValues = {};

  // explicit checks for the only values that can be changed
  if (edits.full_name && edits.full_name !== session.full_name) {
    changedValues.full_name = edits.full_name;
  }
  if (edits.username && edits.username !== session.username) {
    changedValues.username = edits.username;
  }
  // if (edits.password && edits.password !== session.password) {
  //   changedValues.password = edits.password;
  // }

  // check to see if anything's changed and conditionally add last requirement
  if (!Object.keys(changedValues).length) {
    return;
  }

  // update user object with new values
  store.dispatch('SET_PROFILE_BUSY', true);

  savedUserModel.save(changedValues).then(userWithAttrs => {
    // dispatch changes to store
    coreActions.getCurrentSession(store, true);
    store.dispatch('SET_PROFILE_SUCCESS', true);
    store.dispatch('SET_PROFILE_BUSY', false);
    store.dispatch('SET_PROFILE_EROR', false, '');

  // error handling
  }, error => {
    function _errorMessageHandler(apiError) {
      if (apiError.status.code === 400) {
        // access the first apiError message
        return Object.values(apiError.entity)[0][0];
      } else if (apiError.status.code === 403) {
        return apiError.entity[0];
      }
      return '';
    }

    // copying logic from user-create-modal
    store.dispatch('SET_PROFILE_SUCCESS', false);
    store.dispatch('SET_PROFILE_EROR', true, _errorMessageHandler(error));
    store.dispatch('SET_PROFILE_BUSY', false);
  });
}


function resetProfileState(store) {
  const pageState = {
    busy: false,
    success: false,
    error: false,
    errorMessage: '',
  };

  store.dispatch('SET_PAGE_STATE', pageState);
}

function showProfile(store) {
  const userSignedIn = coreGetters.isUserLoggedIn(store.state);
  if (!userSignedIn) {
    router.getInstance().replace({
      name: PageNames.SIGN_IN,
    });
    return;
  }
  store.dispatch('SET_PAGE_NAME', PageNames.PROFILE);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Profile');
  resetProfileState(store);
}

function showSignIn(store) {
  const userSignedIn = coreGetters.isUserLoggedIn(store.state);
  if (userSignedIn) {
    router.getInstance().replace({
      name: PageNames.PROFILE,
    });
    return;
  }
  store.dispatch('SET_PAGE_NAME', PageNames.SIGN_IN);
  store.dispatch('SET_PAGE_STATE', {});
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Sign In');
}


function resetSignUpState(store) {
  const pageState = {
    busy: false,
    errorCode: null,
    errorMessage: '',
  };

  store.dispatch('SET_PAGE_STATE', pageState);
}

function showSignUp(store) {
  const userSignedIn = coreGetters.isUserLoggedIn(store.state);
  if (userSignedIn) {
    router.getInstance().replace({
      name: PageNames.PROFILE,
    });
    return;
  }
  store.dispatch('SET_PAGE_NAME', PageNames.SIGN_UP);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Sign Up');
  resetSignUpState(store);
}

function signUp(store, signUpCreds) {
  const signUpModel = SignUpResource.createModel(signUpCreds);
  const signUpPromise = signUpModel.save(signUpCreds);

  store.dispatch('SET_SIGN_UP_BUSY', true);
  resetSignUpState(store);

  signUpPromise.then(() => {
    store.dispatch('SET_SIGN_UP_ERROR', null, '');
    store.dispatch('SET_SIGN_UP_BUSY', false);
    // TODO: Better solution?
    redirectToHome();
  }).catch(error => {
    function _errorMessageHandler(apiError) {
      if (apiError.status.code === 400 || apiError.status.code === 200) {
        return apiError.entity[0];
      }
      return '';
    }

    store.dispatch('SET_SIGN_UP_ERROR', error.status.code, _errorMessageHandler(error));
    store.dispatch('SET_SIGN_UP_BUSY', false);
  });
}


module.exports = {
  showRoot,
  showSignIn,
  showSignUp,
  signUp,
  resetSignUpState,
  showProfile,
  editProfile,
  resetProfileState,
};
