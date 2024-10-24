import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

export function facilityConfig(state) {
  return state.facilityConfig;
}

export function facilities(state) {
  return state.facilities;
}

export function pageSessionId(state) {
  return state.pageSessionId;
}

export function allowAccess(state) {
  const { isAppContext } = useUser();
  return state.allowRemoteAccess || get(isAppContext);
}

export function isPageLoading(state) {
  return state.loading;
}
