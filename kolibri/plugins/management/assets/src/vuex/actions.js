function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  console.log(`setting ${id}`);  // eslint-disable-line
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

export {
  addClassroom,
  setSelectedClassroomId,
};
