import * as coreApp from 'kolibri';
import * as constants from 'kolibri.coreVue.vuex.constants';

const { RoleResource, FacilityUserResource } = coreApp.resources;
const { LEARNER } = constants.UserKinds;

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
 * Removes a Role from a FacilityUser by roleId
 * @param {?string} roleId
 * @returns {Promise}
 */
function removeRoleFromUser(roleId) {
  if (roleId === null) return Promise.resolve();
  return RoleResource.getModel(roleId).delete();
}

function removeCoachRole(payload) {
  // Need to fetch the user to get access to Roles array, since it isn't in the store
  const promise = promisify(
    FacilityUserResource.getModel(payload.userId).fetch({}, true)
  );
  return promise
    .then((userResult) => findRoleId(userResult, payload.classId))
    .then(removeRoleFromUser);
}

/**
 * Vuex action that removes 'coach' role from user and updates store accordingly
 * @param {Object} store
 * @param {Object} payload
 * @param {string} payload.userId
 * @param {string} payload.classId
 * @returns {Promise}
 */
export function removeCoachRoleAction(store, payload) {
  // remove role from DB -> disable buttons
  const onSuccess = () => {
    store.dispatch('UPDATE_LEARNER_ROLE_FOR_CLASS', {
      userId: payload.userId,
      newRole: LEARNER,
    });
  };

  // handle success -> manually change the user's 'kind' in page state

  // handle failure -> surface error somehow
  return removeCoachRole(payload).then(onSuccess);
}

// Vuex mutation that updates the client
export function UPDATE_LEARNER_ROLE_FOR_CLASS(state, { userId, newRole }) {
  state.pageState.classUsers.forEach((user) => {
    if (user.id === userId) {
      user.kind = newRole;
    }
  });
}
