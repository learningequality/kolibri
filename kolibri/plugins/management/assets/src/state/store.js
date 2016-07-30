const Vuex = require('vuex');

function getInitialState() {
  return {
    facility: 1,
    learners: [],
    error: '',
  };
}


const mutations = {
  ADD_LEARNERS(state, learners) {
    learners.forEach(learner => {
      state.learners.push({
        id: learner.attributes.id,
        username: learner.attributes.username,
        first_name: learner.attributes.first_name,
        last_name: learner.attributes.last_name,
        role: learner.attributes.role,
        roleID: learner.attributes.roleID,
      });
    });
  },

  UPDATE_LEARNERS(state, learners) {
    learners.forEach(learner => {
      state.learners.forEach(existingLearner => {
        if (existingLearner.id === learner.id) {
          existingLearner.username = learner.attributes.username;
          existingLearner.first_name = learner.attributes.first_name;
          existingLearner.last_name = learner.attributes.last_name;
          existingLearner.role = learner.attributes.role;
          existingLearner.roleID = learner.attributes.roleID;
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
};

const store = new Vuex.Store({
  state: getInitialState(),
  mutations,
});

module.exports = {
  mutations,
  store,
};
