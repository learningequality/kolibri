import { FacilityUserResource } from 'kolibri.resources';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';

function fetchFacilityUsers() {
  return FacilityUserResource.getCollection().fetch();
}

export function showPermissionsPage(store) {
  return fetchFacilityUsers()
    .then(function onSuccess(users) {
      store.dispatch('SET_PERMISSIONS_PAGE_STATE', {
        facilityUsers: users,
      });
    })
    .catch(function onFailure(error) {
      handleApiError(store, error);
    });
}
