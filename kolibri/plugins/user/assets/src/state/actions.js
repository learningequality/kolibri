import { PageNames } from '../constants';
import { SignedOutDueToInactivitySnackbar } from 'kolibri.coreVue.vuex.constants';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import { SignUpResource, FacilityUserResource, FacilityResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import Lockr from 'lockr';

const name = 'userPageTitles';

const messages = {
  userProfilePageTitle: 'User Profile',
  userSignInPageTitle: 'User Sign In',
  userSignUpPageTitle: 'User Sign Up',
};

const translator = createTranslator(name, messages);

function redirectToHome() {
  window.location = '/';
}

function resetSignUpState(store) {
  store.dispatch('RESET_SIGN_UP_STATE');
}

function resetProfileState(store) {
  store.dispatch('RESET_PROFILE_STATE');
}

function resetAndSetPageName(store, { pageName, title }) {
  store.dispatch('SET_PAGE_NAME', pageName);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', title);
}

function editProfile(store, edits, session) {
  // payload needs username, fullname, and facility
  // used to save changes to API
  function getUserModel() {
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

  savedUserModel.save(changedValues).then(
    () => {
      // dispatch changes to store
      coreActions.getCurrentSession(store, true);
      store.dispatch('SET_PROFILE_SUCCESS', true);
      store.dispatch('SET_PROFILE_BUSY', false);
      store.dispatch('SET_PROFILE_ERROR', false, '');

      // error handling
    },
    error => {
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
      store.dispatch('SET_PROFILE_ERROR', true, _errorMessageHandler(error));
      store.dispatch('SET_PROFILE_BUSY', false);
    }
  );
}

function showProfile(store) {
  resetAndSetPageName(store, {
    pageName: PageNames.PROFILE,
    title: translator.$tr('userProfilePageTitle'),
  });
  resetProfileState(store);
}

function showSignIn(store) {
  if (Lockr.get(SignedOutDueToInactivitySnackbar)) {
    store.dispatch('CORE_SET_CURRENT_SNACKBAR', SignedOutDueToInactivitySnackbar);
    Lockr.set(SignedOutDueToInactivitySnackbar, null);
  }

  resetAndSetPageName(store, {
    pageName: PageNames.SIGN_IN,
    title: translator.$tr('userSignInPageTitle'),
  });
  store.dispatch('SET_PAGE_STATE', {});
}


function showSignUp(store) {
  return FacilityResource.getCollection().fetch().then(facilities => {
    store.dispatch('CORE_SET_FACILITIES', facilities);
    resetAndSetPageName(store, {
      pageName: PageNames.SIGN_UP,
      title: translator.$tr('userSignUpPageTitle'),
    });
    resetSignUpState(store);
  }).catch(error => coreActions.handleApiError(store, error));
}

function signUp(store, signUpCreds) {
  store.dispatch('SET_SIGN_UP_BUSY', true);
  resetSignUpState(store);
  return SignUpResource.createModel(signUpCreds).save(signUpCreds)
    .then(() => {
      store.dispatch('SET_SIGN_UP_ERROR', null, '');
      // TODO: Better solution?
      redirectToHome();
    })
    .catch(error => {
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

export {
  showSignIn,
  showSignUp,
  signUp,
  resetSignUpState,
  showProfile,
  editProfile,
  resetProfileState,
};
