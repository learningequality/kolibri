import { FacilityResource } from 'kolibri.resources';
import { PageNames } from '../../constants';

export function showSignUpPage(store, fromRoute) {
  // Don't do anything if going between Sign Up steps
  if (fromRoute.name === PageNames.SIGN_UP) {
    return Promise.resolve();
  }
  return FacilityResource.fetchCollection()
    .then(facilities => {
      store.commit('CORE_SET_FACILITIES', facilities);
      store.dispatch('resetAndSetPageName', {
        pageName: PageNames.SIGN_UP,
      });
      store.commit('signUp/RESET_STATE');
    })
    .catch(error => store.dispatch('handleApiError', error));
}
