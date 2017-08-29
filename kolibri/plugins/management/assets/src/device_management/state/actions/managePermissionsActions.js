import {
  DevicePermissionsResource,
  NewDevicePermissionsResource,
  FacilityUserResource,
} from 'kolibri.resources';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';
import isEmpty from 'lodash/isEmpty';

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

/**
 * Serially fetches Permissions, then FacilityUser. If returned Promise rejects,
 * it is from the request for FacilityUser.
 *
 * @param {string} userId
 * @returns Promise<{ permissions, user }, FacilityUserError>
 */
function fetchUserPermissions(userId) {
  const permissionsPromise = DevicePermissionsResource.getModel(userId).fetch({}.true)._promise;
  const userPromise = FacilityUserResource.getModel(userId).fetch()._promise;
  return permissionsPromise
    .then(function onPermissionsSuccess(permissions) {
      return userPromise.then(function onUserSuccess(user) {
        return { permissions, user };
      });
    })
    .catch(function onPermissionsFailure(error) {
      if (error.status.code === 404) {
        return userPromise.then(function onUserSuccess(user) {
          return { permissions: {}, user };
        });
      }
    });
}

/**
 * Action to hydrate manage-permissions-page.
 *
 * @param {Store} store
 * @returns Promise<void>
 */
export function showManagePermissionsPage(store) {
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

/**
 * Action to hydrate user-permissions-page.
 *
 * @param {Store} store
 * @param {string} userId
 * @returns Promise<void>
 */
export function showUserPermissionsPage(store, userId) {
  return fetchUserPermissions(userId)
    .then(function onUserSuccess(data) {
      store.dispatch('CORE_SET_TITLE', `${data.user.full_name}'s Device Permissions`);
      return store.dispatch('SET_USER_PERMISSIONS_PAGE_STATE', data);
    })
    .catch(function onUserFailure(error) {
      if (error.status.code === 404) {
        return store.dispatch('SET_USER_PERMISSIONS_PAGE_STATE', {
          user: null,
          permissions: {},
        });
      }
      return handleApiError(store, error);
    });
}

/**
 * Adds or modifies a DevicePermissions model. If pageState.permissions was not hydrated
 * with a Permissions model, then it is assumed one does not exist and the
 * action creates one.
 *
 * @param {boolean} payload.is_superuser
 * @param {boolean} payload.can_manage_content
 * @returns Promise<DevicePermissions>
 */
export function addOrUpdateUserPermissions(store, payload) {
  const userId = store.state.pageState.user.id;
  const permissions = {
    user: userId,
    is_superuser: payload.is_superuser,
    can_manage_content: payload.can_manage_content,
  };

  // If pageState.permissions is empty, then need to do a POST
  if (isEmpty(store.state.pageState.permissions)) {
    return NewDevicePermissionsResource.createModel(permissions).save()._promise;
  }
  return DevicePermissionsResource.getModel(userId).save(permissions)._promise;
}
