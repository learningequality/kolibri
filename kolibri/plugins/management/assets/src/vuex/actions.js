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

const classroomCollection = new Resource.Collection([], 'classroom');
const learnerGroupCollection = new Resource.Collection([], 'learnergroup');
const learnerCollection = new Resource.Collection([], 'facilityuser');
const memberCollection = new Resource.Collection([], 'membership');

// An action for setting up the initial state of the app by fetching data from the server
function fetch({ dispatch }) {
  const learnerGroupPromise = new Promise((resolve) => {
    classroomCollection.fetch().then(() => {
      const cids = classroomCollection.map(c => c.id);
      learnerGroupCollection.fetch({ params: { parent__id__in: cids } }).then((groupData) => {
        resolve(groupData);
      });
    });
  });

  const learnerPromise = learnerCollection.fetch();

  const memberPromise = memberCollection.fetch();

  const promises = [learnerGroupPromise, learnerPromise, memberPromise];
  // This block of code is executed if learnerGroup, learner, and membership
  // fetching all return with status code 200.
  // class fetching is not included because learnerGroup fetching depends upon it.
  Promise.all(promises).then(() => {
    const groupedLearners = new Set();
    dispatch('ADD_LEARNER_GROUPS', learnerGroupCollection.map(group => {
      const learnerIds = memberCollection.filter(m => m.collection === group.id)
        .map(m => m.user);
      learnerIds.forEach(id => groupedLearners.add(id));
      return Object.assign({}, group, {
        learners: learnerCollection.filter(learner => learnerIds.indexOf(learner.id) !== -1)
          .map(learner => learner.id),
      });
    }));

    dispatch(
      'ADD_CLASSROOMS',
      classroomCollection.map(classroom => {
        const learnerIds = memberCollection.filter(m => m.collection === classroom.id)
          .map(m => m.user);
        const ungroupedLearners = learnerIds.filter(id => !groupedLearners.has(id));
        return Object.assign(
          {},
          classroom,
          {
            learnerGroups: learnerGroupCollection.filter(g => g.parent === classroom.id)
              .map(g => g.id),
            ungroupedLearners,
          }
        );
      })
    );
    dispatch('ADD_LEARNERS', learnerCollection.map(a => a));
  });
}

module.exports = {
  addClassroom,
  setSelectedClassroomId,
  setSelectedGroupId,
  fetch,
};
