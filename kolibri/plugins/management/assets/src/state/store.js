const Vuex = require('vuex');

function getInitialState() {
  return {
    facility: undefined,
    learners: [],
    error: '',
  };
}


const mutations = {
  ADD_LEARNERS(state, learners) {
    learners.forEach(learner => {
      state.learners.push({
        id: learner.id,
        username: learner.username,
        first_name: learner.first_name,
        last_name: learner.last_name,
        roles: learner.roles,
      });
    });
  },

  UPDATE_LEARNERS(state, learners) {
    learners.forEach(learner => {
      state.learners.forEach(existingLearner => {
        if (existingLearner.id === learner.id.toString()) {
          existingLearner.username = learner.username;
          existingLearner.first_name = learner.first_name;
          existingLearner.last_name = learner.last_name;
          existingLearner.roles = learner.roles;
        }
      });
    });
  },

  DELETE_LEARNERS(state, ids) {
    ids.forEach(id => {
      state.learners.forEach((learner, index) => {
        if (learner.id === id) {
          if (index > -1) {
            state.learners.splice(index, 1);
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
};

const store = new Vuex.Store({
  state: getInitialState(),
  mutations,
});

module.exports = {
  mutations,
  store,
};
