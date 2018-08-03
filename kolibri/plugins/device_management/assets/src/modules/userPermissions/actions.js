import { DevicePermissionsResource } from 'kolibri.resources';

/**
 * Adds or modifies a DevicePermissions model.
 *
 * @param {boolean} payload.is_superuser
 * @param {boolean} payload.can_manage_content
 * @returns Promise<DevicePermissions>
 */
export function addOrUpdateUserPermissions(store, payload) {
  const permissions = {
    user: payload.userId,
    is_superuser: payload.is_superuser,
    can_manage_content: payload.can_manage_content,
  };

  return DevicePermissionsResource.saveModel({ id: payload.userId, data: permissions });
}
