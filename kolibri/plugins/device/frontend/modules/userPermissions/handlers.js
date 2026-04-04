import DevicePermissionsResource from 'kolibri-common/apiResources/DevicePermissionsResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import useUser from 'kolibri/composables/useUser';
import { get } from '@vueuse/core';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { pageLoading } from '../../composables/usePageLoading';

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
 * Action to hydrate user-permissions-page.
 *
 * @param {Store} store
 * @param {string} userId
 * @returns Promise<void>
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
        store.dispatch('handleApiError', { error, reloadOnReconnect: true });
        pageLoading.value = false;
      }
    });
}
