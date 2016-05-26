function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

function setSelectedGroupId({ dispatch }, id) {
  dispatch('SET_SELECTED_GROUP_ID', id);
}

/*
Used to wrap xhrs below, but note that it sets the onreadystatechange function,
trampling whatever is there.
 */
function promiseWrapper(xhr) {
  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = () => { // eslint-disable-line no-param-reassign
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve();
      } else if (xhr.readyState === 4 && xhr.status !== 200) {
        reject();
      }
    };
  });
}

// An action for setting up the initial state of the app by fetching data from the server
function fetch({ dispatch }, classroomListUrl, learnerGroupListUrl,
                             learnerListUrl, membershipListUrl) {
  /*
  Takes as parameters urls for the four API list endpoints that it uses.
   */
  const xhr1 = new XMLHttpRequest();
  const xhr2 = new XMLHttpRequest();
  const xhr3 = new XMLHttpRequest();
  const xhr4 = new XMLHttpRequest();

  const promises = [xhr2, xhr3, xhr4].map(xhr => promiseWrapper(xhr));

  xhr1.open('GET', classroomListUrl);
  let classrooms = [];
  xhr1.onreadystatechange = () => {
    if (xhr1.readyState === 4 && xhr1.status === 200) {
      classrooms = JSON.parse(xhr1.response);
      const cids = classrooms.map(c => c.id);
      xhr2.open(
        'GET',
        `${learnerGroupListUrl}?parent_in=${global.encodeURIComponent(JSON.stringify(cids))}`
      );
      xhr2.send();
    }
  };
  xhr1.send();

  xhr3.open('GET', learnerListUrl);
  xhr3.send();

  xhr4.open('GET', membershipListUrl);
  xhr4.send();

  // This block of code is executed if xhr2, xhr3, and xhr4 all return with status code 200.
  // xhr1 is not included because my simple promise wrapper sets the onreadystatechange property.
  Promise.all(promises).then(() => {
    const learnerGroups = JSON.parse(xhr2.response);
    const learners = JSON.parse(xhr3.response);
    const memberships = JSON.parse(xhr4.response);

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
