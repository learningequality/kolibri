import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';

const { RoleResource, FacilityUserResource } = coreApp.resources;
const { COACH } = constants.UserKinds;

/**
 * Adds a Role to a User in the context of a Collection
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.collectionId
 * @param {string} payload.userRole - maps to `kind`
 * @returns {Promise}
 */
export function addRoleToUserInCollection(payload) {
  return RoleResource.createModel({
    user: payload.userId,
    collection: payload.collectionId,
    kind: payload.userRole,
  }).save();
}

/**
 * Removes a Role from a FacilityUser by roleId
 * @param {?string} roleId
 */
export function removeRoleFromUser(roleId) {
  if (roleId === null) return Promise.resolve();
  return RoleResource.getModel(roleId).delete();
}

/**
 * Adds the 'coach' role to a learner in a Class
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export function addCoachRole(payload) {
  return addRoleToUserInCollection({
    userId: payload.userId,
    collectionId: payload.classId,
    userRole: COACH,
  });
}


// Utility that unwraps ConditionalPromises back to normal Promises.
// conditionalPromise.then(f) seems to ignore implementation of f and just
// treat it as identity function
function promisify(condPromise) {
  return condPromise._promise;
}

function findRoleId({ roles }, classId) {
  const matchIdx = roles.findIndex((r) => r.collection === +classId);
  return matchIdx !== -1 ? roles[matchIdx].id : null;
}

/**
 * Removes the 'coach' role to a learner in a Class
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export function removeCoachRole(payload) {
  const promise = promisify(
    FacilityUserResource.getModel(payload.userId).fetch({}, true)
  );
  return promise
    .then((userResult) => findRoleId(userResult, payload.classId))
    .then(removeRoleFromUser);
}
