import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';

/**
 * Serially fetches Permissions, then FacilityUser. If returned Promise rejects,
 * it is from the request for FacilityUser.
 *
 * @param {string} userId
 * @returns Promise<{ permissions, user }, FacilityUserError>
 */
function fetchUserPermissions(userId) {
  const permissionsPromise = DevicePermissionsResource.fetchModel({ id: userId, force: true });
  const userPromise = FacilityUserResource.fetchModel({ id: userId });
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
      return store.commit('userPermissions/SET_STATE', data);
    })
    .catch(function onUserFailure(error) {
      if (error.status.code === 404) {
        return store.commit('userPermissions/SET_STATE', {
          user: null,
          permissions: {},
        });
      }
      return store.dispatch('handleApiError', error);
    });
}
