/* eslint-disable prefer-arrow-callback */
const { RoleResource, FacilityUserResource } = require('kolibri').resources;
const { COACH, LEARNER } = require('kolibri.coreVue.vuex.constants').UserKinds;
const { dispatchError, dispatchRoleChange } = require('./addCoachRoleAction');

// Assumes if a Learner has any kind of Role in class, then it is of Coach
function deleteRoleFromUser(classId, userData) {
  const { roles } = userData;
  const matchIdx = roles.findIndex((r) => String(r.collection) === classId);
  const roleId = matchIdx !== -1 ? roles[matchIdx].id : null;
  return new Promise((resolve, reject) => {
    if (roleId === null) {
      reject();
    } else {
      resolve(RoleResource.getModel(roleId).delete());
    }
  });
}
/**
 * Vuex action that removes 'coach' role from a User in a Class and updates store accordingly
 * @param {Object} store
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
exports.default = function removeCoachRoleAction(store, payload) {
  const { classId, userId } = payload;
  // Need to fetch User since the Roles array isn't current stored locally.
  // Need to unwrap to normal Promise since conditionalPromise.then(f) seems to ignore
  // implementation of f and just treat it as identity function
  const facilityUserRequest = FacilityUserResource.getModel(userId).fetch({}, true)._promise;
  dispatchRoleChange(store, { newRole: LEARNER, userId });
  return (
    facilityUserRequest
    .then((userResult) => deleteRoleFromUser(classId, userResult))
    .then(function onSuccess(deleteResult) {
      // Currently, Learners in classes switch between Coach <-> Learner
      // So if not a Coach, then just a plain-old Learner
    })
    .catch(function onFailure(err) {
      dispatchRoleChange(store, { newRole: COACH, userId });
      if (err) {
        dispatchError(store, err);
      }
    })
  );
};
