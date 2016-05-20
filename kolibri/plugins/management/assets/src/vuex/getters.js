function getClassrooms(state) {
  return state.classrooms;
}

function getSelectedClassroomId(state) {
  return state.selectedClassroomId;
}

module.exports = {
  getClassrooms,
  getSelectedClassroomId,
};
