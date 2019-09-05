import isEmpty from 'lodash/isEmpty';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { FacilityUserResource } from 'kolibri.resources';
import { updateFacilityLevelRoles } from './utils';

/**
 * Does a POST request to assign a user role (only used in this file)
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.facility
 * @param {string} user.roles
 * Needed: id, facility, role
 */
function setUserRole(user, role) {
  return updateFacilityLevelRoles(user, role.kind).then(() => {
    // Force refresh the User to get updated roles
    return FacilityUserResource.fetchModel({ id: user.id, force: true });
  });
}

/**
 * Do a POST to create new user
 * @param {object} stateUserData
 *  Needed: username, full_name, facility, role, password
 */
export function createFacilityUser(store, payload) {
  return FacilityUserResource.saveModel({
    data: {
      facility: store.rootState.core.session.facility_id,
      username: payload.username,
      full_name: payload.full_name,
      password: payload.password,
      id_number: payload.id_number,
      gender: payload.gender,
      birth_year: payload.birth_year,
    },
  }).then(facilityUser => {
    if (payload.role.kind !== UserKinds.LEARNER) {
      return setUserRole(facilityUser, payload.role);
    }
  });
}

export function updateFacilityUserDetails(store, { userId, updates }) {
  const { facilityUserUpdates, roleUpdates } = updates;
  if (isEmpty(facilityUserUpdates) && !roleUpdates) {
    return Promise.resolve();
  }
  return FacilityUserResource.saveModel({ id: userId, data: { ...facilityUserUpdates } }).then(
    user => {
      if (roleUpdates) {
        return updateFacilityLevelRoles(user, roleUpdates.kind);
      }
    }
  );
}

export function updateFacilityUserPassword(store, { userId, password }) {
  return FacilityUserResource.saveModel({ id: userId, data: { password } });
}

export function deleteFacilityUser(store, { userId }) {
  return FacilityUserResource.deleteModel({ id: userId });
}
