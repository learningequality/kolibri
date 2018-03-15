import { UserKinds } from 'kolibri.coreVue.vuex.constants';

/**
 * Vuex State Mappers
 *
 * The methods below help map data from
 * the API to state in the Vuex store
 */
export function _classState(data) {
  return {
    id: data.id,
    name: data.name,
    parent: data.parent,
    memberCount: data.learner_count,
    coachCount: data.coach_count,
    adminCount: data.admin_count,
  };
}

// On 'Users' page, this will end up showing a Admin/Coach role if user has such
// Role for any class
export function _userState(apiUserData) {
  function calcUserKind() {
    if (apiUserData.roles) {
      // array of strings, where each string represents a role object
      const roleKinds = apiUserData.roles.map(roleObj => roleObj.kind);
      if (roleKinds.includes(UserKinds.ADMIN)) {
        return UserKinds.ADMIN;
      } else if (roleKinds.includes(UserKinds.COACH)) {
        return UserKinds.COACH;
      }
    }
    return UserKinds.LEARNER;
  }

  return {
    id: apiUserData.id,
    facility_id: apiUserData.facility,
    username: apiUserData.username,
    full_name: apiUserData.full_name,
    kind: calcUserKind(apiUserData.roles),
    is_superuser: apiUserData.is_superuser,
  };
}

/**
 * Title Helper
 */

export function _managePageTitle(title) {
  return `Manage ${title}`;
}
