
const Vuex = require('vuex');
const coreStore = require('core-store');
const constants = require('./constants');

const initialState = {
  pageName: constants.PageNames.USER_MGMT_PAGE,
  pageState: {},
  facility: undefined,
  users: [], // this should be inside page state
  roles: [],
};

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
  SET_PAGE_NAME(state, name) {
    state.pageName = name;
  },
  SET_PAGE_STATE(state, pageState) {
    state.pageState = pageState;
  },

  SET_ROLES(state, roles) {
    state.roles = roles;
  },
};


// assigns core state and mutations
Object.assign(initialState, coreStore.initialState);
Object.assign(mutations, coreStore.mutations);


module.exports = new Vuex.Store({
  state: initialState,
  mutations,
});
