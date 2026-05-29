import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

export function canAccessUnassignedContent(state) {
  const { hasRole } = useUser();
  return state.canAccessUnassignedContentSetting || get(hasRole);
}

export function allowGuestAccess(state) {
  return state.allowGuestAccess;
}
