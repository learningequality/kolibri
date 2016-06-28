const Vuex = require('vuex');

// Set up initial state
const ALL_CLASSROOMS_ID = null;
// These constant values are totally arbitrary.
// Just don't want them to clash with *actual* group ids
const ALL_GROUPS_ID = 'allgroups';
const NO_GROUPS_ID = 'nogroups';
const UNGROUPED_ID = 'ungrouped';

function getInitialState() {
  /* It should have a classrooms attribute that looks like this
  const classrooms = [
    {
      id: <my cool id>,
      name: 'Classroom A',
      learnerGroups: [<a list of learner group ids>],
      ungroupedLearners: [<a list of learner ids>]
    },
  ];
  */
  const classrooms = [];

  /* and a learnerGroups attribute that looks like this
  const learnerGroups = [
    {
      id: <my cool id>,
      name: 'Excelling!',
      learners: [<a list of learner ids>],
    },
  ];
  */
  const learnerGroups = [];

  /* and finally a learners attribute that looks like this
  const learners = [
    {
      id: 1,
      first_name: 'Mike',
      last_name: 'G',
      username: 'mike',
    },
  */
  const learners = [];

  return {
    classrooms,
    learners,
    learnerGroups,
    selectedClassroomId: ALL_CLASSROOMS_ID, // is the value `null`, which has special meaning here
    selectedGroupId: NO_GROUPS_ID,
  };
}


const mutations = {
  ADD_CLASSROOM(state, attrs) {
    state.classrooms.push({
      id: attrs.id,
      name: attrs.name,
      learnerGroups: attrs.learnerGroups,
    });
  },

  ADD_CLASSROOMS(state, classrooms) {
    for (const classroom of classrooms) {
      state.classrooms.push({
        id: classroom.id,
        name: classroom.name,
        learnerGroups: classroom.learnerGroups,
        ungroupedLearners: classroom.ungroupedLearners,
      });
    }
  },

  ADD_LEARNER_GROUPS(state, groups) {
    for (const group of groups) {
      state.learnerGroups.push({
        id: group.id,
        name: group.name,
        learners: group.learners,
      });
    }
  },

  ADD_LEARNERS(state, learners) {
    learners.forEach(learner => {
      state.learners.push({
        id: learner.id,
        username: learner.username,
        first_name: learner.first_name,
        last_name: learner.last_name,
      });
    });
  },

  SET_SELECTED_CLASSROOM_ID(state, id) {
    // Disable no-param-reassign rule... that is expressly the purpose of this function
    state.selectedClassroomId = id; // eslint-disable-line no-param-reassign
  },

  SET_SELECTED_GROUP_ID(state, id) {
    // Disable no-param-reassign rule... that is expressly the purpose of this function
    state.selectedGroupId = id; // eslint-disable-line no-param-reassign
  },
};

const store = new Vuex.Store({
  state: getInitialState(),
  mutations,
});

const constants = {
  ALL_CLASSROOMS_ID,
  ALL_GROUPS_ID,
  NO_GROUPS_ID,
  UNGROUPED_ID,
};

module.exports = {
  mutations,
  store,
  constants,
};
