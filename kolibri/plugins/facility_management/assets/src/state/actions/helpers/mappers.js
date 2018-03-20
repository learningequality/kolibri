import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import find from 'lodash/find';

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */

// On 'Users' page, this will end up showing a Admin/Coach role if user has such
// Role for any class
function userDisplayRole(facilityUser) {
  const facilityRole = find(facilityUser.roles, { collection: facilityUser.facility });
  if (facilityRole) {
    return facilityRole.kind;
  }
  return UserKinds.LEARNER;
}

export function _userState(facilityUser) {
  return {
    id: facilityUser.id,
    facility_id: facilityUser.facility,
    username: facilityUser.username,
    full_name: facilityUser.full_name,
    kind: userDisplayRole(facilityUser),
    is_superuser: facilityUser.is_superuser,
    roles: facilityUser.roles,
  };
}

/**
 * Title Helper
 */

export function _managePageTitle(title) {
  return `Manage ${title}`;
}
