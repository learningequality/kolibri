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

/**
 * Updates a facility user's details and/or role.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.userId - The ID of the user to update.
 * @param {object} root0.updates - Object containing facilityUserUpdates and optional roleUpdates.
 * @returns {Promise<void>} Resolves when the user has been updated.
 */
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

/**
 * Updates the password for a facility user.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.userId - The ID of the user to update.
 * @param {string} root0.password - The new password to set.
 * @returns {Promise<object>} Resolves with the updated user model.
 */
export function updateFacilityUserPassword(store, { userId, password }) {
  return FacilityUserResource.saveModel({ id: userId, data: { password } });
}

/**
 * Deletes a facility user by ID.
 * @param {object} store - The Vuex store instance.
 * @param {object} root0 - Payload object.
 * @param {string} root0.userId - The ID of the user to delete.
 * @returns {Promise<void>} Resolves when the user has been deleted.
 */
export function deleteFacilityUser(store, { userId }) {
  return FacilityUserResource.deleteModel({ id: userId });
}
