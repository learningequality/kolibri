function getClassrooms(state) {
  return state.classrooms;
}

function getLearnerGroups(state) {
  return state.learnerGroups;
}

function getLearners(state) {
  return state.learners;
}

function getSelectedClassroomId(state) {
  return state.selectedClassroomId;
}

function getSelectedGroupId(state) {
  return state.selectedGroupId;
}

module.exports = {
  getClassrooms,
  getLearnerGroups,
  getLearners,
  getSelectedClassroomId,
  getSelectedGroupId,
};
