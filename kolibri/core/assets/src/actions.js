
const UserKinds = require('./constants').UserKinds;

function logIn(store, payload) {
  console.log('store in actions.js: ', store, 'payload: ', payload, 'username: ', payload.username);
  store.dispatch('CORE_SET_SESSION', {
    kind: UserKinds.ADMIN,
    facility_id: '1',
    user_id: '2',
    username: payload.username,
    fullname: 'Mr. Pertater Herd',
  });
}

function logOut(store) {
  store.dispatch('CORE_CLEAR_SESSION');
}

module.exports = {
  logIn,
  logOut,
};

/** FROM OLD ACTIONS.JS IN MANAGEMENT
 * Do a POST to login the user.
 * @param {object} payload
 */
// function login(store, payload) {
//   const facilityIdPromise = FacilityUserResource.login(payload);
//   facilityIdPromise.then(response => {
//     store.dispatch('SET_LOGGED_IN_USERNAME', payload.username);
//     store.dispatch('SET_LOGGED_IN_STATE', true);
//   },
//   reject => {
//     store.dispatch('SET_ERROR', JSON.stringify(reject, null, '\t'));
//   });
// }

// /**
//  * Do a POST to logout the user.
//  */
// function logout(store) {
//   const facilityIdPromise = FacilityUserResource.logout();
//   facilityIdPromise.then(response => {
//     console.log('logout in actions.js called');
//   },
//   reject => {
//     store.dispatch('SET_ERROR', JSON.stringify(reject, null, '\t'));
//   });
// }
