import isEmpty from 'lodash/isEmpty';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import { UserKinds } from 'kolibri/constants';
import { updateFacilityLevelRoles } from './utils';
import { fetchSortedFacilityUsersHandler } from './handlers';

/**
 * Fetch facility users with sorting applied based on the column clicked
 * @param {Object} store - Vuex store
 * @param {Object} payload - Contains the column, order, page, and page_size information
 * @param {string} payload.column - The name of the column to sort by
 * @param {string} payload.order - The sort order ("asc", "desc", or null)
 * @param {number} payload.page - The page number
 * @param {number} payload.page_size - The number of items per page
 */
export function fetchSortedFacilityUsers(store, payload) {
  return fetchSortedFacilityUsersHandler(store, payload);
}

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
