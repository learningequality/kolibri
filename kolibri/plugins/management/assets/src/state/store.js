const Vuex = require('vuex');

function getInitialState() {
  return {
    facility: undefined,
    users: [],
    error: '',
    loggedInUsername: 'w0w_us3rnam3',
    name: 'Jessica Aceret',
    role: 'Learner',
    loggedIn: false,
  };
}


const mutations = {
  ADD_USERS(state, users) {
    users.forEach(user => {
      state.users.push({
        id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        roles: user.roles,
      });
    });
  },

  UPDATE_USERS(state, users) {
    users.forEach(user => {
      state.users.forEach(existingUser => {
        if (existingUser.id === user.id.toString()) {
          existingUser.username = user.username;
          existingUser.first_name = user.first_name;
          existingUser.last_name = user.last_name;
          existingUser.roles = user.roles;
        }
      });
    });
  },

  DELETE_USERS(state, ids) {
    ids.forEach(id => {
      state.users.forEach((user, index) => {
        if (user.id === id) {
          if (index > -1) {
            state.users.splice(index, 1);
          }
        }
      });
    });
  },

  SET_FACILITY(state, id) {
    state.facility = id;
  },

  SET_ERROR(state, error) {
    state.error = error;
  },

  SET_LOGGED_IN_STATE(state, bool) {
    state.loggedIn = bool;
  },

  SET_LOGGED_IN_USERNAME(state, username) {
    state.loggedInUsername = username;
  },
};

const store = new Vuex.Store({
  state: getInitialState(),
  mutations,
});

module.exports = {
  mutations,
  store,
};
