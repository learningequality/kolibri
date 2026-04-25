import DevicePermissionsResource from 'kolibri-common/apiResources/DevicePermissionsResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

/**
 * Serially fetches Permissions, then FacilityUser. If the returned Promise rejects, it
 * is from the request for FacilityUser.
 * @param {string} userId - The ID of the user to fetch permissions for.
 * @returns {Promise<{permissions: object, user: object}>} Resolves with combined
 * permissions and user data.
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
      if (error.response.status === 404) {
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
 * Load the user permissions page state into the Vuex store.
 * @param {object} store - The Vuex store instance.
 * @param {string} userId - The ID of the user whose permissions to display.
 * @param {object} route - The current Vue Router route object.
 * @returns {Promise<void>} Resolves when state has been loaded.
 */
export function showUserPermissionsPage(store, userId, route) {
  const { fetchFacilities } = useFacilities();
  const setUserPermissionsState = state => store.commit('userPermissions/SET_STATE', state);

  // Don't request any data if not an Admin
  const { isSuperuser } = useUser();
  if (!get(isSuperuser)) {
    setUserPermissionsState({ user: null, permissions: {} });
    pageLoading.value = false;
    return Promise.resolve();
  }

  const shouldResolve = samePageCheckGenerator(route);

  return Promise.all([fetchUserPermissions(userId), fetchFacilities()])
    .then(([data]) => {
      if (shouldResolve()) {
        setUserPermissionsState({ user: data.user, permissions: data.permissions });
      }
      pageLoading.value = false;
    })
    .catch(error => {
      if (shouldResolve()) {
        if (error.response.status === 404) {
          setUserPermissionsState({ user: null, permissions: {} });
        }
        handleApiError({ error, reloadOnReconnect: true });
        pageLoading.value = false;
      }
    });
}
