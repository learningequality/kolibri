import { FacilityUserResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

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
      store.dispatch('getCurrentSession', true, { root: true });
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
  const session = store.rootState.core.session;

  store.commit('SET_PROFILE_BUSY', true);

  return FacilityUserResource.saveModel({ id: session.user_id, data: { password } }).then(
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_MODAL', false);
      store.commit(
        'CORE_CREATE_SNACKBAR',
        {
          text: snackbarTranslator.$tr('passwordChangeSuccessMessage'),
          autoDismiss: true,
        },
        { root: true }
      );
    },
    () => {
      store.commit('SET_PROFILE_BUSY', false);
      store.commit('SET_PROFILE_PASSWORD_ERROR', true);
    }
  );
}
