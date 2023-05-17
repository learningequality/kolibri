import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
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

function fetchFacilityUsers() {
  return FacilityUserResource.fetchCollection();
}

export function showManagePermissionsPage(store) {
  const shouldResolve = samePageCheckGenerator(store);
  store.commit('managePermissions/SET_LOADING_FACILITY_USERS', true);
  const promises = Promise.all([fetchFacilityUsers(store), fetchDevicePermissions()]);
  return promises
    .then(function onSuccess([users, permissions]) {
      if (shouldResolve()) {
        store.commit('managePermissions/SET_STATE', {
          facilityUsers: users,
          permissions,
        });
      }
    })
    .catch(function onFailure(error) {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    })
    .finally(() => {
      store.commit('managePermissions/SET_LOADING_FACILITY_USERS', false);
    });
}
