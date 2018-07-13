import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import groupBy from 'lodash/groupBy';
import mapValues from 'lodash/mapValues';
import head from 'lodash/head';

function fetchFacilityUsers(store) {
  const facilityId = store.getters.currentFacilityId;
  return FacilityUserResource.getCollection({ member_of: facilityId }).fetch();
}

function fetchDevicePermissions() {
  return DevicePermissionsResource.getCollection()
    .fetch(true)
    .then(function transform(permissions) {
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
  const permissionsPromise = DevicePermissionsResource.getModel(userId).fetch(true);
  const userPromise = FacilityUserResource.getModel(userId).fetch();
  return permissionsPromise
    .then(function onPermissionsSuccess(permissions) {
      return userPromise.then(function onUserSuccess(user) {
        return { permissions, user };
      });
    })
    .catch(function onPermissionsFailure(error) {
      if (error.status.code === 404) {
        return userPromise.then(function onUserSuccess(user) {
          return {
            permissions: {
              is_superuser: false,
              can_manage_content: false,
            },
            user,
          };
        });
      }
    });
}

/**
 * Action to hydrate ManagePermissionsPage.
 *
 * @param {Store} store
 * @returns Promise<void>
 */
export function showManagePermissionsPage(store) {
  const promises = ConditionalPromise.all([
    fetchFacilityUsers(store),
    fetchDevicePermissions(),
  ]).only(samePageCheckGenerator(store));
  return promises
    .then(function onSuccess([users, permissions]) {
      store.commit('SET_PERMISSIONS_PAGE_STATE', {
        facilityUsers: users,
        permissions,
      });
    })
    .catch(function onFailure(error) {
      store.dispatch('handleApiError', error);
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
  const promise = ConditionalPromise.all([fetchUserPermissions(userId)]).only(
    samePageCheckGenerator(store)
  );
  return promise
    .then(function onUserSuccess([data]) {
      return store.commit('SET_USER_PERMISSIONS_PAGE_STATE', data);
    })
    .catch(function onUserFailure(error) {
      if (error.status.code === 404) {
        return store.commit('SET_USER_PERMISSIONS_PAGE_STATE', {
          user: null,
          permissions: {},
        });
      }
      return store.dispatch('handleApiError', error);
    });
}

/**
 * Adds or modifies a DevicePermissions model.
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

  return DevicePermissionsResource.getModel(userId).save(permissions);
}
