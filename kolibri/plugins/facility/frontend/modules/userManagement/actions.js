import isEmpty from 'lodash/isEmpty';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { UserKinds } from 'kolibri/constants';
import { updateFacilityLevelRoles } from './utils';

/**
 * Updates the facility-level role for a user and refreshes the user model.
 * @param {object} user - The facility user object.
 * @param {object} role - The role object containing the kind to assign.
 * @returns {Promise<object>} Resolves with the refreshed user model.
 */
function setUserRole(user, role) {
  return updateFacilityLevelRoles(user, role.kind).then(() => {
    // Force refresh the User to get updated roles
    return FacilityUserResource.fetchModel({ id: user.id, force: true });
  });
}

/**
 * Creates a new facility user and optionally assigns a non-learner role.
 * @param {object} store - The Vuex store instance.
 * @param {object} payload - User creation data: username, password, role, and demographics.
 * @returns {Promise<object|void>} Resolves when the user has been created.
 */
export function createFacilityUser(store, payload) {
  return FacilityUserResource.saveModel({
    data: {
      facility: store.rootGetters.activeFacilityId,
      username: payload.username,
      full_name: payload.full_name,
      password: payload.password,
      id_number: payload.id_number,
      gender: payload.gender,
      birth_year: payload.birth_year,
      extra_demographics: payload.extra_demographics,
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
    },
  );
}

export function updateFacilityUserPassword(store, { userId, password }) {
  return FacilityUserResource.saveModel({ id: userId, data: { password } });
}

export function deleteFacilityUser(store, { userId }) {
  return FacilityUserResource.deleteModel({ id: userId });
}
