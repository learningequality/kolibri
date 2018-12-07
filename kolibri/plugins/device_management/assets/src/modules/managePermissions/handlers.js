import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';

function fetchDevicePermissions() {
  return DevicePermissionsResource.fetchCollection({ force: true }).then(function transform(
    permissions
  ) {
    // returns object, where userid is the key
    return mapValues(groupBy(permissions, 'user'), head);
  });
}

function fetchFacilityUsers(store) {
  const facilityId = store.getters.currentFacilityId;
  return FacilityUserResource.fetchCollection({ getParams: { member_of: facilityId } });
}

export function showManagePermissionsPage(store) {
  const promises = ConditionalPromise.all([
    fetchFacilityUsers(store),
    fetchDevicePermissions(),
  ]).only(samePageCheckGenerator(store));
  return promises
    .then(function onSuccess([users, permissions]) {
      store.commit('managePermissions/SET_STATE', {
        facilityUsers: users,
        permissions,
      });
    })
    .catch(function onFailure(error) {
      store.dispatch('handleApiError', error);
    });
}
