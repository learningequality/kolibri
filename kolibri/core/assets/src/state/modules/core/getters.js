import useUser from 'kolibri.coreVue.composables.useUser';
import { get } from '@vueuse/core';
import { MaxPointsPerContent } from '../../../constants';

export function facilityConfig(state) {
  return state.facilityConfig;
}

export function facilities(state) {
  return state.facilities;
}

export function totalPoints(state) {
  return state.totalProgress * MaxPointsPerContent;
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
