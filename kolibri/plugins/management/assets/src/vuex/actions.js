function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

function setSelectedGroupId({ dispatch }, id) {
  dispatch('SET_SELECTED_GROUP_ID', id);
}

const Resource = require('../../../../../core/assets/src/api_resource');

// An action for setting up the initial state of the app by fetching data from the server
function fetch({ dispatch }) {
  const classroomResource = new Resource('classroom');
  const learnerGroupResource = new Resource('learnergroup');
  const learnerResource = new Resource('facilityuser');
  const memberResource = new Resource('membership');


  let classrooms = [];

  const learnerGroupPromise = new Promise((resolve) => {
    classroomResource.getCollection().then((data) => {
      classrooms = data;
      const cids = classrooms.map(c => c.id);
      learnerGroupResource.getCollection({ parents_in: cids }).then((groupData) => {
        resolve(groupData);
      });
    });
  });


  const learnerPromise = learnerResource.getCollection();

  const memberPromise = memberResource.getCollection();

  const promises = [learnerGroupPromise, learnerPromise, memberPromise];
  // This block of code is executed if learnerGroup, learner, and membership
  // fetching all return with status code 200.
  // class fetching is not included because learnerGroup fetching depends upon it.
  Promise.all(promises).then((results) => {
    const learnerGroups = results[0];
    const learners = results[0];
    const memberships = results[0];

    const groupedLearners = new Set();
    dispatch('ADD_LEARNER_GROUPS', learnerGroups.map(group => {
      const learnerIds = memberships.filter(m => m.collection === group.id)
        .map(m => m.user);
      learnerIds.forEach(id => groupedLearners.add(id));
      return Object.assign({}, group, {
        learners: learners.filter(learner => learnerIds.indexOf(learner.id) !== -1)
          .map(learner => learner.id),
      });
    }));

    dispatch(
      'ADD_CLASSROOMS',
      classrooms.map(classroom => {
        const learnerIds = memberships.filter(m => m.collection === classroom.id)
          .map(m => m.user);
        const ungroupedLearners = learnerIds.filter(id => !groupedLearners.has(id));
        return Object.assign(
          {},
          classroom,
          {
            learnerGroups: learnerGroups.filter(g => g.parent === classroom.id)
              .map(g => g.id),
            ungroupedLearners,
          }
        );
      })
    );

    dispatch('ADD_LEARNERS', learners);
  });
}

module.exports = {
  addClassroom,
  setSelectedClassroomId,
  setSelectedGroupId,
  fetch,
};
