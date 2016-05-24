function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

function fetch({ dispatch }) {
  const urls = global.kolibriGlobal.urls;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', urls.classroom_list());
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) { // DONE
      if (xhr.status === 200) {
        for (const classroom of JSON.parse(xhr.response)) {
          console.log(classroom); // eslint-disable-line
          dispatch('ADD_CLASSROOM', {
            id: classroom.id,
            name: classroom.name,
          });
        }
      }
    }
  };
  xhr.send();
}

module.exports = {
  addClassroom,
  setSelectedClassroomId,
  fetch,
};
