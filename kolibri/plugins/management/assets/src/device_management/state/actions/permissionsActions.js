import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';

function fetchFacilityUsers() {
  return FacilityUserResource.getCollection().fetch();
}

function fetchDevicePermissions() {
  return DevicePermissionsResource.getCollection()
    .fetch({}, true)
    ._promise.then(function transform(permissions) {
      // returns object, where userid is the key
      return mapValues(groupBy(permissions, 'user'), head);
    });
}

export function showPermissionsPage(store) {
  const promises = Promise.all([fetchFacilityUsers(), fetchDevicePermissions()]);
  return promises
    .then(function onSuccess([users, permissions]) {
      store.dispatch('SET_PERMISSIONS_PAGE_STATE', {
        facilityUsers: users,
        permissions,
      });
    })
    .catch(function onFailure(error) {
      handleApiError(store, error);
    });
}
