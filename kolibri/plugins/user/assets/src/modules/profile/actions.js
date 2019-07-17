import { FacilityUserResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const snackbarTranslator = createTranslator('UserProfilePageSnackbars', {
  passwordChangeSuccessMessage: 'Password changed',
});

export function updateUserProfile(store, { edits, session }) {
  const changedValues = {};

  if (edits.full_name && edits.full_name !== session.full_name) {
    changedValues.full_name = edits.full_name;
  }
  if (edits.username && edits.username !== session.username) {
    changedValues.username = edits.username;
  }

  if (Object.keys(changedValues).length === 0) {
    return Promise.resolve();
  }

  return FacilityUserResource.saveModel({
    id: session.user_id,
    data: changedValues,
    exists: true,
  }).then(() => {
    store.dispatch('setSession', { session: changedValues }, { root: true });
  });
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
