import useFacilities from 'kolibri-common/composables/useFacilities';
import { ComponentMap } from '../../constants';

export function showSignUpPage(store, fromRoute) {
  const { getFacilities } = useFacilities();

  // Don't do anything if going between Sign Up steps
  if (fromRoute.name === ComponentMap.SIGN_UP) {
    return Promise.resolve();
  }

  return getFacilities()
    .then(() => {
      store.dispatch('reset');
    })
    .catch(error => store.dispatch('handleApiError', { error, reloadOnReconnect: true }));
}
