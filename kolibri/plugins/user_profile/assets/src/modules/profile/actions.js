import isEmpty from 'lodash/isEmpty';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

export function updateUserProfile(store, { updates }) {
  if (isEmpty(updates)) {
    return Promise.resolve();
  }

  const { currentUserId } = useUser();

  return FacilityUserResource.saveModel({
    id: get(currentUserId),
    data: updates,
    exists: true,
  }).then(() => {
    store.dispatch('setSession', { session: updates }, { root: true });
  });
}

export function updateUserProfilePassword(store, password) {
  const { currentUserId } = useUser();
  return FacilityUserResource.saveModel({
    id: get(currentUserId),
    data: { password },
    exists: true,
  });
}
