import DevicePermissionsResource from 'kolibri-common/apiResources/DevicePermissionsResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';

function fetchDevicePermissions() {
  return DevicePermissionsResource.fetchCollection({ force: true }).then(
    function transform(permissions) {
      // returns object, where userid is the key
      return mapValues(groupBy(permissions, 'user'), head);
    },
  );
}

function fetchFacilityUsers() {
  return FacilityUserResource.fetchCollection();
}

export function showManagePermissionsPage(store) {
  const shouldResolve = samePageCheckGenerator(store);
  store.commit('managePermissions/SET_LOADING_FACILITY_USERS', true);
  store.dispatch('notLoading'); // We're loading data now, not the page
  const promises = Promise.all([fetchFacilityUsers(store), fetchDevicePermissions()]);
  return promises
    .then(([users, permissions]) => {
      if (shouldResolve()) {
        store.commit('managePermissions/SET_STATE', {
          facilityUsers: users,
          permissions,
        });
      }
      return store.commit('managePermissions/SET_LOADING_FACILITY_USERS', false);
    })
    .catch(error => {
      store.commit('managePermissions/SET_LOADING_FACILITY_USERS', false);
      return shouldResolve()
        ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
        : null;
    });
}
