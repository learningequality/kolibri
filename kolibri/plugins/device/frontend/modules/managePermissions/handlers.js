import DevicePermissionsResource from 'kolibri-common/apiResources/DevicePermissionsResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

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

export function showManagePermissionsPage(store, route) {
  const shouldResolve = samePageCheckGenerator(route);
  store.commit('managePermissions/SET_LOADING_FACILITY_USERS', true);
  pageLoading.value = false; // We're loading data now, not the page
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
      if (shouldResolve()) {
        handleApiError({ error, reloadOnReconnect: true });
      }
    });
}
