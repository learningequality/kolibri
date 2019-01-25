import { DevicePermissionsResource, FacilityUserResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('UserPermissionToolbarTitles', {
  loading: 'Loading user permissions…',
  goBackTitle: 'Go Back',
  invalidUserTitle: 'Invalid user ID',
});

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
  const setAppBarTitle = title => store.commit('coreBase/SET_APP_BAR_TITLE', title);
  const setUserPermissionsState = state => store.commit('userPermissions/SET_STATE', state);
  const stopLoading = () => store.commit('CORE_SET_PAGE_LOADING', false);

  // Don't request any data if not an Admin
  if (!store.getters.isSuperuser) {
    setUserPermissionsState({ user: null, permissions: {} });
    setAppBarTitle(translator.$tr('goBackTitle'));
    stopLoading();
    return Promise.resolve();
  }

  // CoreBase parameters for loading state
  setAppBarTitle(translator.$tr('loading'));

  const samePage = samePageCheckGenerator(store);

  return Promise.all([fetchUserPermissions(userId), store.dispatch('getFacilities')])
    .then(([data]) => {
      if (samePage()) {
        setAppBarTitle(data.user.full_name);
        setUserPermissionsState({ user: data.user, permissions: data.permissions });
        stopLoading();
      }
    })
    .catch(error => {
      if (samePage()) {
        if (error.status.code === 404) {
          setAppBarTitle(translator.$tr('invalidUserTitle'));
          setUserPermissionsState({ user: null, permissions: {} });
        }
        store.dispatch('handleApiError', error);
        stopLoading();
      }
    });
}
