import { FacilityUserResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import CatchErrors from 'kolibri.utils.CatchErrors';
import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

const snackbarTranslator = createTranslator('UserProfilePageSnackbars', {
  passwordChangeSuccessMessage: 'Password changed',
});

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
      store.commit('CORE_SET_SESSION', changedValues, { root: true });
      store.commit('SET_PROFILE_SUCCESS', true);
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_ERRORS', []);
    },
    error => {
      const errorsCaught = CatchErrors(error, [ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS]);
      if (errorsCaught) {
        store.commit('SET_PROFILE_ERRORS', errorsCaught);
        store.commit('SET_PROFILE_SUCCESS', false);
        store.commit('SET_PROFILE_BUSY', false);
      } else {
        store.dispatch('handleApiError', error, { root: true });
      }
    }
  );
}

export function updateUserProfilePassword(store, password) {
  const session = store.rootState.core.session;

  store.commit('SET_PROFILE_BUSY', true);

  return FacilityUserResource.saveModel({
    id: session.user_id,
    data: { password },
    exists: true,
  }).then(
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_MODAL', false);
      store.dispatch('createSnackbar', snackbarTranslator.$tr('passwordChangeSuccessMessage'), {
        root: true,
      });
    },
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_ERROR', true);
    }
  );
}
