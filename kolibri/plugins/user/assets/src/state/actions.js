import { SIGNED_OUT_DUE_TO_INACTIVITY } from 'kolibri.coreVue.vuex.constants';
import { SignUpResource, FacilityUserResource, FacilityResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import Lockr from 'lockr';
import { PageNames } from '../constants';

const snackbarTranslator = createTranslator('UserPageSnackbars', {
  passwordChangeSuccessMessage: 'Password changed',
  signedOut: 'You were automatically signed out due to inactivity',
  dismiss: 'Dismiss',
});

function resetAndSetPageName(store, { pageName }) {
  store.commit('SET_PAGE_NAME', pageName);
  store.commit('CORE_SET_PAGE_LOADING', false);
  store.commit('CORE_SET_ERROR', null);
}

export function updateUserProfile(store, { edits, session }) {
  // payload needs username, fullname, and facility
  // used to save changes to API
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

  store.commit('SET_PROFILE_BUSY', true);

  return FacilityUserResource.saveModel({
    id: session.user_id,
    data: changedValues,
    exists: true,
  }).then(
    () => {
      store.dispatch('getCurrentSession', true);
      store.commit('SET_PROFILE_SUCCESS', true);
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_ERROR', { isError: false });
    },
    error => {
      const { status, entity } = error;
      let errorMessage = '';
      if (status.code === 400) {
        errorMessage = Object.values(entity)[0][0];
      } else if (status.code === 403) {
        errorMessage = entity[0];
      }
      store.commit('SET_PROFILE_SUCCESS', false);
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_ERROR', {
        isError: true,
        errorMessage,
        errorCode: status.code,
      });
    }
  );
}

export function updateUserProfilePassword(store, password) {
  const session = store.state.core.session;

  store.commit('SET_PROFILE_BUSY', true);

  return FacilityUserResource.saveModel({ id: session.user_id, data: { password } }).then(
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_MODAL', false);
      store.commit('CORE_CREATE_SNACKBAR', {
        text: snackbarTranslator.$tr('passwordChangeSuccessMessage'),
        autoDismiss: true,
      });
    },
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_ERROR', true);
    }
  );
}

export function showProfilePage(store) {
  resetAndSetPageName(store, {
    pageName: PageNames.PROFILE,
  });
  store.commit('RESET_PROFILE_STATE');
}

export function setFacilitiesAndConfig(store) {
  return store.dispatch('getFacilities').then(() => {
    return store.dispatch('getFacilityConfig');
  });
}

export function showSignInPage(store) {
  if (Lockr.get(SIGNED_OUT_DUE_TO_INACTIVITY)) {
    store.commit('CORE_CREATE_SNACKBAR', {
      text: snackbarTranslator.$tr('signedOut'),
      actionText: snackbarTranslator.$tr('dismiss'),
      actionCallback: () => store.commit('CORE_CLEAR_SNACKBAR'),
    });
    Lockr.set(SIGNED_OUT_DUE_TO_INACTIVITY, null);
  }
  setFacilitiesAndConfig(store).then(() => {
    // grabs facilityId from session, which is the backend's default on sign in page
    store.commit('SET_FACILITY_ID', store.getters.currentFacilityId);
    store.commit('SET_PAGE_STATE', {
      hasMultipleFacilities: store.getters.facilities.length > 1,
    });
    resetAndSetPageName(store, {
      pageName: PageNames.SIGN_IN,
    });
  });
}

export function showSignUpPage(store) {
  return FacilityResource.fetchCollection()
    .then(facilities => {
      store.commit('CORE_SET_FACILITIES', facilities);
      resetAndSetPageName(store, {
        pageName: PageNames.SIGN_UP,
      });
      store.commit('RESET_SIGN_UP_STATE');
    })
    .catch(error => store.dispatch('handleApiError', error));
}

export function signUpNewUser(store, signUpCreds) {
  store.commit('SET_SIGN_UP_BUSY', true);
  store.commit('RESET_SIGN_UP_STATE');
  return SignUpResource.saveModel({ data: signUpCreds })
    .then(() => {
      store.commit('SET_SIGN_UP_ERROR', { errorCode: null });
      window.location = '/';
    })
    .catch(error => {
      const { status, entity } = error;
      let errorMessage = '';
      if (status.code === 400 || status.code === 200) {
        errorMessage = entity[0];
      }
      store.commit('SET_SIGN_UP_ERROR', {
        errorCode: status.code,
        errorMessage,
      });
      store.commit('SET_SIGN_UP_BUSY', false);
    });
}
