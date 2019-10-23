import isEmpty from 'lodash/isEmpty';
import { FacilityUserResource } from 'kolibri.resources';

export function updateUserProfile(store, { updates }) {
  if (isEmpty(updates)) {
    return Promise.resolve();
  }

  return FacilityUserResource.saveModel({
    id: store.rootGetters.currentUserId,
    data: updates,
    exists: true,
  }).then(() => {
    store.dispatch('setSession', { session: updates }, { root: true });
  });
}

export function updateUserProfilePassword(store, password) {
  return FacilityUserResource.saveModel({
    id: store.rootGetters.currentUserId,
    data: { password },
    exists: true,
  });
}
