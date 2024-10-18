import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

export function canAccessUnassignedContent(state) {
  const { isCoach, isAdmin, isSuperuser } = useUser();

  return (
    state.canAccessUnassignedContentSetting || get(isCoach) || get(isAdmin) || get(isSuperuser)
  );
}

export function allowGuestAccess(state) {
  return state.allowGuestAccess;
}
