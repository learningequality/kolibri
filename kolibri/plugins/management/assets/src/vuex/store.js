const Vue = require('vue');
const Vuex = require('vuex');

Vue.use(Vuex);

// Set up initial state
let classroomCounter = 0;
function getClassroomId() {
  classroomCounter += 1;
  return classroomCounter;
}

const ALL_CLASSROOMS_ID = null;

function getInitialState() {
  const johnDuck = {
    id: 2,
    first_name: 'John',
    last_name: 'Duck',
    username: 'jduck',
  };
  const learners = [
    {
      id: 1,
      first_name: 'Mike',
      last_name: 'G',
      username: 'mike',
    },
    johnDuck,
    {
      id: 3,
      first_name: 'Abe',
      last_name: 'Lincoln',
      username: 'abe',
    },
    {
      id: 4,
      first_name: 'Jessica',
      last_name: 'Aceret',
      username: 'jbot',
    },
  ];
  const classrooms = [
    {
      id: getClassroomId(),
      name: 'Classroom A',
      learnerGroups: [1, 2],
      // learners: [1, 3],
    },
    {
      id: getClassroomId(),
      name: 'Classroom B',
      learnerGroups: [],
      // learners: [],
    },
    {
      id: getClassroomId(),
      name: 'Classroom C',
      learnerGroups: [3],
      // learners: [2],
    },
  ];
  const learnerGroups = [
    {
      id: 1,
      name: 'Group 1',
      learners: [1, 3],
    },
    {
      id: 2,
      name: 'Group 2',
      learners: [3],
    },
    {
      id: 3,
      name: 'Group 3',
      learners: [2],
    },
  ];
  return {
    classrooms,
    learners,
    learnerGroups,
    selectedClassroomId: ALL_CLASSROOMS_ID, // is the value `null`, which has special meaning here
  };
}


const mutations = {
  ADD_CLASSROOM(state, attrs) {
    state.classrooms.push({
      id: getClassroomId(),
      name: attrs.name ? attrs.name : 'Foo',
      learnerGroups: attrs.learnerGroups ? attrs.learnerGroups : [],
    });
  },
  SET_SELECTED_CLASSROOM_ID(state, id) {
    // Disable no-param-reassign rule... that is expressly the purpose of this function
    state.selectedClassroomId = id; // eslint-disable-line no-param-reassign
  },
};

const store = new Vuex.Store({
  state: getInitialState(),
  mutations,
});

const constants = {
  ALL_CLASSROOMS_ID,
};

module.exports = {
  mutations,
  store,
  constants,
};
