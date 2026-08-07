import DevicePermissionsResource from 'kolibri-common/apiResources/DevicePermissionsResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { handleApiError } from 'kolibri/utils/appError';

/**
 * Saves or updates device permissions for a user and commits the updated state to the store.
 * @param {object} store - The Vuex store instance.
 * @param {object} payload - Permissions payload with userId, is_superuser, and can_manage_content.
 * @returns {Promise<object>} Resolves with the updated user model.
 */
export function addOrUpdateUserPermissions(store, payload) {
  const permissions = {
    is_superuser: payload.is_superuser,
    can_manage_content: payload.can_manage_content,
  };

  // showUserPermissionsPage's 404 branch substitutes a defaults object with no `user` key, so
  // its absence means the row does not exist yet - PATCHing it would 404.
  const savePromise = store.state.permissions.user
    ? DevicePermissionsResource.update(payload.userId, permissions)
    : DevicePermissionsResource.create({ user: payload.userId, ...permissions });

  return savePromise
    .then(permissionsModel => {
      return FacilityUserResource.retrieve(payload.userId).then(userModel => {
        store.commit('SET_STATE', {
          user: userModel,
          permissions: permissionsModel,
        });
        return userModel;
      });
    })
    .catch(error => handleApiError({ error }));
}
