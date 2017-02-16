const PageNames = require('./state/constants').PageNames;
const SignUpResource = require('kolibri').resources.SignUpResource;
const coreActions = require('kolibri.coreVue.vuex.actions');
const coreGetters = require('kolibri.coreVue.vuex.getters');
const router = require('kolibri.coreVue.router');


function redirectToHome() {
  window.location = '/';
}

function showRoot(store) {
  const userSignedIn = coreGetters.isUserSignedIn(store.state);
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

function showSignIn(store) {
  const userSignedIn = coreGetters.isUserSignedIn(store.state);
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


function showSignUp(store) {
  const userSignedIn = coreGetters.isUserSignedIn(store.state);
  if (userSignedIn) {
    router.getInstance().replace({
      name: PageNames.PROFILE,
    });
    return;
  }
  store.dispatch('SET_PAGE_NAME', PageNames.SIGN_UP);
  store.dispatch('SET_PAGE_STATE', { signUpError: null });
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', 'User Sign Up');
}


function showProfile(store) {
  const userSignedIn = coreGetters.isUserSignedIn(store.state);
  if (!userSignedIn) {
    router.getInstance().replace({
      name: PageNames.SIGN_IN,
    });
    return;
  }
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
    store.dispatch('SET_SIGN_UP_ERROR', null);
    // TODO: Better solution?
    redirectToHome();
  }).catch(error => {
    if (error.status.code === 400) {
      store.dispatch('SET_SIGN_UP_ERROR', 400);
    } else {
      coreActions.handleApiError(store, error);
    }
  });
}


module.exports = {
  showRoot,
  showSignIn,
  showSignUp,
  showProfile,
  signUp,
};
