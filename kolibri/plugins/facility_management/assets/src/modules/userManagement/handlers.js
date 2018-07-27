import { FacilityUserResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import { _userState } from '../mappers';

// An action for setting up the initial state of the app by fetching data from the server
export function showUserPage(store) {
  store.dispatch('preparePage', {
    name: PageNames.USER_MGMT_PAGE,
  });

  const facilityId = store.getters.currentFacilityId;

  return FacilityUserResource.fetchCollection({
    getParams: { member_of: facilityId },
    force: true,
  }).only(
    samePageCheckGenerator(store),
    users => {
      store.commit('userManagement/SET_STATE', {
        facilityUsers: users.map(_userState),
        modalShown: false,
        error: '',
        isBusy: false,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
