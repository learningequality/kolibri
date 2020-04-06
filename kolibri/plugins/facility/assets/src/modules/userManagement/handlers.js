import { FacilityUserResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { _userState } from '../mappers';

// An action for setting up the initial state of the app by fetching data from the server
export function showUserPage(store, toRoute) {
  store.dispatch('preparePage');
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;

  return FacilityUserResource.fetchCollection({
    getParams: { member_of: facilityId },
    force: true,
  }).only(
    samePageCheckGenerator(store),
    users => {
      store.commit('userManagement/SET_STATE', {
        facilityUsers: users.map(_userState),
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
