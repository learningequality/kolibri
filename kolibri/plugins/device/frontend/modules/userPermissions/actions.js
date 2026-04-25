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
    user: payload.userId,
    is_superuser: payload.is_superuser,
    can_manage_content: payload.can_manage_content,
  };

  return DevicePermissionsResource.saveModel({ id: payload.userId, data: permissions })
    .then(permissionsModel => {
      return FacilityUserResource.fetchModel({ id: payload.userId, force: true }).then(
        userModel => {
          store.commit('SET_STATE', {
            user: userModel,
            permissions: permissionsModel,
          });
          return userModel;
        },
      );
    })
    .catch(error => handleApiError({ error }));
}
