/* eslint-disable prefer-arrow-callback */
import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';
import { dispatchError, dispatchRoleChange } from './addCoachRoleAction';

const { RoleResource, FacilityUserResource } = coreApp.resources;
const { LEARNER } = constants.UserKinds;

// Assumes if a Learner has any kind of Role in class, then it is of Coach
function deleteRoleFromUser(classId, userData) {
  const { roles } = userData;
  const matchIdx = roles.findIndex((r) => r.collection === String(classId));
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
export default function removeCoachRoleAction(store, payload) {
  const { classId, userId } = payload;
  // Need to fetch User since the Roles array isn't current stored locally.
  // Need to unwrap to normal Promise since conditionalPromise.then(f) seems to ignore
  // implementation of f and just treat it as identity function
  const facilityUserRequest = FacilityUserResource.getModel(userId).fetch({}, true)._promise;
  return (
    facilityUserRequest
    .then((userResult) => deleteRoleFromUser(classId, userResult))
    .then(function onSuccess(deleteResult) {
      // Currently, Learners in classes switch between Coach <-> Learner
      // So if not a Coach, then just a plain-old Learner
      dispatchRoleChange(store, { newRole: LEARNER, userId });
    })
    .catch(function onFailure(err) {
      if (err) dispatchError(store, err);
    })
  );
}
