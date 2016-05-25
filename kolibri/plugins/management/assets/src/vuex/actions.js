function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

function setSelectedGroupId({ dispatch }, id) {
  dispatch('SET_SELECTED_GROUP_ID', id);
}


// An action for setting up the initial state of the app by fetching data from the server
function fetch({ dispatch }, classroomListUrl, learnerGroupUrl) {
  /*
  param urls: A django-js-reverse urls object for getting API urls.
   */
  const xhr = new XMLHttpRequest();

  xhr.open('GET', classroomListUrl);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const classrooms = JSON.parse(xhr.response);
      const cids = classrooms.map(c => c.id);
      const xhr2 = new XMLHttpRequest();
      xhr2.open('GET', `${learnerGroupUrl}?parent_in=${global.encodeURIComponent(JSON.stringify(cids))}`);  // eslint-disable-line max-len
      xhr2.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const learnerGroups = JSON.parse(xhr.response);

          dispatch('ADD_CLASSROOMS', classrooms.map(classroom =>
            Object.assign({}, classroom, {
              learnerGroups: learnerGroups.filter(g => g.parent === classroom.id),
            })
          ));

          dispatch('ADD_LEARNER_GROUPS', learnerGroups.map(group =>
            Object.assign({}, group, {
              learners: [],
            })
          ));
        }
      };
      xhr2.send();
    }
  };
  xhr.send();
}

module.exports = {
  addClassroom,
  setSelectedClassroomId,
  setSelectedGroupId,
  fetch,
};
