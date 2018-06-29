import { SIGNED_OUT_DUE_TO_INACTIVITY } from 'kolibri.coreVue.vuex.constants';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import { currentFacilityId, facilities } from 'kolibri.coreVue.vuex.getters';
import { SignUpResource, FacilityUserResource, FacilityResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import Lockr from 'lockr';
import { PageNames } from '../constants';

const translator = createTranslator('userPageTitles', {
  userProfilePageTitle: 'User Profile',
  userSignInPageTitle: 'User Sign In',
  userSignUpPageTitle: 'User Sign Up',
});

export function resetSignUpState(store) {
  store.dispatch('RESET_SIGN_UP_STATE');
}

export function resetProfileState(store) {
  store.dispatch('RESET_PROFILE_STATE');
}

function resetAndSetPageName(store, { pageName, title }) {
  store.dispatch('SET_PAGE_NAME', pageName);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('CORE_SET_ERROR', null);
  store.dispatch('CORE_SET_TITLE', title);
}

export function updateUserProfile(store, { edits, session }) {
  // payload needs username, fullname, and facility
  // used to save changes to API
  const savedUserModel = FacilityUserResource.getModel(session.user_id);
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
  if (Object.keys(changedValues).length === 0) {
    return Promise.resolve();
  }

  store.dispatch('SET_PROFILE_BUSY', true);

  return savedUserModel.save(changedValues).then(
    () => {
      coreActions.getCurrentSession(store, true);
      store.dispatch('SET_PROFILE_SUCCESS', true);
      store.dispatch('SET_PROFILE_BUSY', false);
      store.dispatch('SET_PROFILE_ERROR', { isError: false });
    },
    error => {
      const { status, entity } = error;
      let errorMessage = '';
      if (status.code === 400) {
        errorMessage = Object.values(entity)[0][0];
      } else if (status.code === 403) {
        errorMessage = entity[0];
      }
      store.dispatch('SET_PROFILE_SUCCESS', false);
      store.dispatch('SET_PROFILE_BUSY', false);
      store.dispatch('SET_PROFILE_ERROR', {
        isError: true,
        errorMessage,
        errorCode: status.code,
      });
    }
  );
}

export function updateUserProfilePassword(store, password) {
  const session = store.state.core.session;
  const savedUserModel = FacilityUserResource.getModel(session.user_id);

  store.dispatch('SET_PROFILE_BUSY', true);

  return savedUserModel.save({ password }).then(
    () => {
      store.dispatch('SET_PROFILE_BUSY', false);
      store.dispatch('SET_PROFILE_PASSWORD_MODAL', false);
      coreActions.createSnackbar(store, {
        text: createTranslator('updatePassword', {
          passwordChangeSuccessMessage: 'Password changed',
        }).$tr('passwordChangeSuccessMessage'),
        autoDismiss: true,
      });
    },
    () => {
      store.dispatch('SET_PROFILE_BUSY', false);
      store.dispatch('SET_PROFILE_PASSWORD_ERROR', true);
    }
  );
}

export function showProfilePage(store) {
  resetAndSetPageName(store, {
    pageName: PageNames.PROFILE,
    title: translator.$tr('userProfilePageTitle'),
  });
  resetProfileState(store);
}

export function setFacilitiesAndConfig(store) {
  return coreActions.getFacilities(store).then(() => {
    return coreActions.getFacilityConfig(store);
  });
}

export function showSignInPage(store) {
  const trs = createTranslator('signedOutSnackbar', {
    signedOut: 'You were automatically signed out due to inactivity',
    dismiss: 'Dismiss',
  });
  if (Lockr.get(SIGNED_OUT_DUE_TO_INACTIVITY)) {
    coreActions.createSnackbar(store, {
      text: trs.$tr('signedOut'),
      actionText: trs.$tr('dismiss'),
      actionCallback: () => coreActions.clearSnackbar(store),
    });
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, null);
  }
  setFacilitiesAndConfig(store).then(() => {
    // grabs facilityId from session, which is the backend's default on sign in page
    store.dispatch('SET_FACILITY_ID', currentFacilityId(store.state));
    store.dispatch('SET_PAGE_STATE', {
      hasMultipleFacilities: facilities(store.state).length > 1,
    });
    resetAndSetPageName(store, {
      pageName: PageNames.SIGN_IN,
      title: translator.$tr('userSignInPageTitle'),
    });
  });
}

export function showSignUpPage(store) {
  return FacilityResource.getCollection()
    .fetch()
    .then(facilities => {
      store.dispatch('CORE_SET_FACILITIES', facilities);
      resetAndSetPageName(store, {
        pageName: PageNames.SIGN_UP,
        title: translator.$tr('userSignUpPageTitle'),
      });
      resetSignUpState(store);
    })
    .catch(error => coreActions.handleApiError(store, error));
}

export function signUpNewUser(store, signUpCreds) {
  store.dispatch('SET_SIGN_UP_BUSY', true);
  resetSignUpState(store);
  return SignUpResource.createModel(signUpCreds)
    .save(signUpCreds)
    .then(() => {
      store.dispatch('SET_SIGN_UP_ERROR', { errorCode: null });
      window.location = '/';
    })
    .catch(error => {
      const { status, entity } = error;
      let errorMessage = '';
      if (status.code === 400 || status.code === 200) {
        errorMessage = entity[0];
      }
      store.dispatch('SET_SIGN_UP_ERROR', {
        errorCode: status.code,
        errorMessage,
      });
      store.dispatch('SET_SIGN_UP_BUSY', false);
    });
}
