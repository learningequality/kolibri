import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import { useFacilities } from 'kolibri-common/composables/useFacilities';
import { ComponentMap } from '../../constants';

export function showSignUpPage(store, fromRoute) {
  const { setFacilities } = useFacilities();

  // Don't do anything if going between Sign Up steps
  if (fromRoute.name === ComponentMap.SIGN_UP) {
    return Promise.resolve();
  }
  return FacilityResource.fetchCollection()
    .then(facilities => {
      setFacilities(facilities);
      store.dispatch('reset');
    })
    .catch(error => store.dispatch('handleApiError', { error, reloadOnReconnect: true }));
}
