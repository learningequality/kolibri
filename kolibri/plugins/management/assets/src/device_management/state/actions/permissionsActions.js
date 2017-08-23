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

function fetchUserPermissions(userId) {
  const permissionsPromise = DevicePermissionsResource.getModel(userId).fetch()._promise;
  const userPromise = FacilityUserResource.getModel(userId).fetch()._promise;
  return permissionsPromise
    .then(function onSuccess(permissions) {
      return userPromise.then(function userSuccess(user) {
        return { permissions, user };
      });
    })
    .catch(function onFailure(error) {
      if (error.status.code === 404) {
        return userPromise.then(function userSuccess(user) {
          return { permissions: {}, user };
        });
      }
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

export function showUserPermissionsPage(store, userId) {
  return fetchUserPermissions(userId)
    .then(function onSuccess(data) {
      return store.dispatch('SET_USER_PERMISSIONS_PAGE_STATE', data);
    })
    .catch(function onFailure(error) {
      return handleApiError(store, error);
    });
}
