import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';

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
