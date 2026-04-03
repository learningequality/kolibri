import UserSyncStatusResource from 'kolibri-common/apiResources/UserSyncStatusResource';
import store from 'kolibri/store';

/**
 * Fetch sync status for all members of a class.
 * @param {string} classId - The classroom ID
 * @returns {Promise<Array|Error>} Array of sync status objects, or Error on failure
 */
export function fetchClassSyncStatus(classId) {
  return UserSyncStatusResource.fetchCollection({
    force: true,
    getParams: { member_of: classId },
  }).catch(error => {
    store.dispatch('handleApiError', { error });
    return error;
  });
}
