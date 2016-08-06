const UserKinds = require('./constants').UserKinds;

function logIn(store) {
  store.dispatch('CORE_SET_SESSION', {
    kind: UserKinds.ADMIN,
    facility_id: '1',
    user_id: '2',
    username: 'starchy52',
    fullname: 'Mr. Potato Head',
  });
}

function logOut(store) {
  store.dispatch('CORE_CLEAR_SESSION');
}

module.exports = {
  logIn,
  logOut,
};
