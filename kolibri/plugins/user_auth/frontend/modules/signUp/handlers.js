import useFacilities from 'kolibri-common/composables/useFacilities';
import { handleApiError } from 'kolibri/utils/appError';
import { ComponentMap } from '../../constants';

export function showSignUpPage(store, fromRoute) {
  const { fetchFacilities } = useFacilities();

  // Don't do anything if going between Sign Up steps
  if (fromRoute.name === ComponentMap.SIGN_UP) {
    return Promise.resolve();
  }

  return fetchFacilities()
    .then(() => {
      store.dispatch('reset');
    })
    .catch(error => handleApiError({ error, reloadOnReconnect: true }));
}
