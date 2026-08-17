import isEmpty from 'lodash/isEmpty';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { UserKinds } from 'kolibri/constants';
import { selectedFacilityId } from 'kolibri-common/composables/useFacility';
import { updateFacilityLevelRoles } from './utils';

/**
 * Does a POST request to assign a user role (only used in this file). Needed fields on `user`:
 * `id`, `facility`.
 * @param {object} user - The facility user object.
 * @param {object} role - The role object; `role.kind` is the role kind to assign.
 * @returns {Promise<object>} Resolves with the refreshed user model.
 */
function setUserRole(user, role) {
  return updateFacilityLevelRoles(user, role.kind).then(() => {
    // Force refresh the User to get updated roles
    return FacilityUserResource.retrieve(user.id);
  });
}

/**
 * Does a POST to create a new facility user. Needed fields on `payload`: `username`, `full_name`,
 * `facility`, `role`, `password`.
 * @param {object} store - The Vuex store instance.
 * @param {object} payload - User creation data: username, password, role, and demographics.
 * @returns {Promise<object|void>} Resolves when the user has been created.
 */
export function createFacilityUser(store, payload) {
  return FacilityUserResource.create({
    facility: selectedFacilityId.value,
    username: payload.username,
    full_name: payload.full_name,
    password: payload.password,
    id_number: payload.id_number,
    gender: payload.gender,
    birth_year: payload.birth_year,
    extra_demographics: payload.extra_demographics,
  }).then(facilityUser => {
    if (payload.role.kind !== UserKinds.LEARNER) {
      return setUserRole(facilityUser, payload.role);
    }
  });
}

/**
 * Updates a facility user's details, and their facility-level role when it changed.
 * `updates.facilityUserUpdates` is already diff-only — `UserEditPage.getUpdates` picks just the
 * fields that differ from the fetched user — so no baseline is passed to `update`.
 * `updateFacilityLevelRoles` needs the user's current roles, so a role-only change reads the user
 * back rather than writing an empty patch.
 * @param {object} store - The Vuex store instance.
 * @param {object} payload - Payload object.
 * @param {string} payload.userId - The ID of the user to update.
 * @param {object} payload.updates - `{ facilityUserUpdates, roleUpdates }`.
 * @returns {Promise<void>} Resolves when the user has been updated.
 */
export function updateFacilityUserDetails(store, { userId, updates }) {
  const { facilityUserUpdates, roleUpdates } = updates;
  if (isEmpty(facilityUserUpdates) && !roleUpdates) {
    return Promise.resolve();
  }
  const userPromise = isEmpty(facilityUserUpdates)
    ? FacilityUserResource.retrieve(userId)
    : FacilityUserResource.update(userId, facilityUserUpdates);
  return userPromise.then(user => {
    if (roleUpdates) {
      return updateFacilityLevelRoles(user, roleUpdates.kind);
    }
  });
}

export function updateFacilityUserPassword(store, { userId, password }) {
  return FacilityUserResource.update(userId, { password });
}

export function deleteFacilityUser(store, { userId }) {
  return FacilityUserResource.delete(userId);
}
