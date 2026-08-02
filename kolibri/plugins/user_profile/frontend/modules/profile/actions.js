import isEmpty from 'lodash/isEmpty';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

export function updateUserProfile(store, { updates }) {
  if (isEmpty(updates)) {
    return Promise.resolve();
  }

  const { currentUserId, setSession } = useUser();

  return FacilityUserResource.accessDetailEndpoint(
    'patch',
    'detail',
    get(currentUserId),
    updates,
  ).then(() => {
    setSession({ session: updates });
  });
}

export function updateUserProfilePassword(store, password) {
  const { currentUserId } = useUser();
  return FacilityUserResource.accessDetailEndpoint('patch', 'detail', get(currentUserId), {
    password,
  });
}
