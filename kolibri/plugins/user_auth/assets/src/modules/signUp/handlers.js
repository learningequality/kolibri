import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import { ComponentMap } from '../../constants';

export function showSignUpPage(store, fromRoute) {
  // Don't do anything if going between Sign Up steps
  if (fromRoute.name === ComponentMap.SIGN_UP) {
    return Promise.resolve();
  }
  return FacilityResource.fetchCollection()
    .then(facilities => {
      store.commit('CORE_SET_FACILITIES', facilities);
      store.dispatch('reset');
    })
    .catch(error => store.dispatch('handleApiError', { error, reloadOnReconnect: true }));
}
