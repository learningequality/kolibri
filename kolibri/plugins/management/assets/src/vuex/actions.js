const { constants } = require('./store.js');

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
function fetch({ dispatch }, classroomListUrl, learnerGroupListUrl,
                             learnerListUrl, membershipListUrl) {
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
      xhr2.open('GET', `${learnerGroupListUrl}?parent_in=${global.encodeURIComponent(JSON.stringify(cids))}`);  // eslint-disable-line max-len
      xhr2.onreadystatechange = () => {
        if (xhr2.readyState === 4 && xhr2.status === 200) {
          const xhr3 = new XMLHttpRequest();
          xhr3.open('GET', learnerListUrl);
          xhr3.onreadystatechange = () => {
            if (xhr3.readyState === 4 && xhr3.status === 200) {
              const xhr4 = new XMLHttpRequest();
              xhr4.open('GET', membershipListUrl);
              xhr4.onreadystatechange = () => {
                if (xhr4.readyState === 4 && xhr4.status === 200) {
                  const learnerGroups = JSON.parse(xhr2.response);
                  const learners = JSON.parse(xhr3.response);
                  const memberships = JSON.parse(xhr4.response);

                  dispatch('ADD_CLASSROOMS', classrooms.map(classroom => {
                    const lgs = [{
                      id: constants.UNGROUPED_ID,
                      name: 'Ungrouped',
                      learners: [],
                    }];
                    lgs.push(...learnerGroups.filter(g => g.parent === classroom.id));
                    return Object.assign({}, classroom, {
                      learnerGroups: lgs,
                    });
                  }));

                  dispatch('ADD_LEARNER_GROUPS', learnerGroups.map(group => {
                    const learnerIds = memberships.filter(m => m.collection === group.id)
                      .map(m => m.user);
                    return Object.assign({}, group, {
                      learners: learners.filter(learner => learnerIds.indexOf(learner.id) !== -1)
                        .map(learner => learner.id),
                    });
                  }));

                  dispatch('ADD_LEARNERS', learners);
                }
              };
              xhr4.send();
            }
          };
          xhr3.send();
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
