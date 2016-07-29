const Kolibri = require('kolibri');


function addClassroom({ dispatch }, attrs) {
  dispatch('ADD_CLASSROOM', attrs);
}

function setSelectedClassroomId({ dispatch }, id) {
  dispatch('SET_SELECTED_CLASSROOM_ID', id);
}

function setSelectedGroupId({ dispatch }, id) {
  dispatch('SET_SELECTED_GROUP_ID', id);
}

const ClassroomResource = Kolibri.resources.ClassroomResource;
const LearnerGroupResource = Kolibri.resources.LearnerGroupResource;
const MembershipResource = Kolibri.resources.MembershipResource;
const FacilityUserResource = Kolibri.resources.FacilityUserResource;
const RoleResource = Kolibri.resources.RoleResource;

function createUser(store, payload, role) {
  const FacilityUserModel = FacilityUserResource.addModelData(payload);
  const newUserPromise = FacilityUserModel.save(payload);
  newUserPromise.then((model) => {
    // always add role atrribute to facilityUser
    model.attributes.role = role;
    // assgin role to this new user if the role is not learner
    if (role === 'learner') {
      // mutation ADD_LEARNERS only take array
      store.dispatch('ADD_LEARNERS', [model]);
    } else {
      const rolePayload = {
        user: model.attributes.id,
        collection: model.attributes.facility,
        kind: role,
      };
      const RoleModel = RoleResource.addModelData(rolePayload);
      const newRolePromise = RoleModel.save(rolePayload);
      newRolePromise.then((results) => {
        // mutation ADD_LEARNERS only take array
        store.dispatch('ADD_LEARNERS', [model]);
      }).catch((error) => {
        store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
      });
    }
  })
  .catch((error) => {
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

function deleteUser(store, id) {
  const FacilityUserModel = Kolibri.resources.FacilityUserResource.getModel(id);
  const newUserPromise = FacilityUserModel.delete(id);
  newUserPromise.then((userId) => {
    store.dispatch('DELETE_LEARNERS', [userId]);
  })
  .catch((error) => {
    store.dispatch('SET_ERROR', JSON.stringify(error, null, '\t'));
  });
}

// An action for setting up the initial state of the app by fetching data from the server
function fetch({ dispatch }) {
  const classroomCollection = ClassroomResource.getCollection();
  const learnerGroupCollection = LearnerGroupResource.getCollection();
  const learnerCollection = FacilityUserResource.getCollection();
  const memberCollection = MembershipResource.getCollection();

  const learnerGroupPromise = new Promise((resolve) => {
    classroomCollection.fetch().then(() => {
      const cid = classroomCollection.models.map(c => c.id)[0];
      learnerGroupCollection.fetch({ params: { parent: cid } }).then((groupData) => {
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
    dispatch('ADD_LEARNER_GROUPS', learnerGroupCollection.models.map(group => {
      const learnerIds = memberCollection.models.filter(m => m.collection === group.id)
        .map(m => m.user);
      learnerIds.forEach(id => groupedLearners.add(id));
      return Object.assign({}, group, {
        learners: learnerCollection.models.filter(learner => learnerIds.indexOf(learner.id) !== -1)
          .map(learner => learner.id),
      });
    }));

    dispatch(
      'ADD_CLASSROOMS',
      classroomCollection.models.map(classroom => {
        const learnerIds = memberCollection.models.filter(m => m.collection === classroom.id)
          .map(m => m.user);
        const ungroupedLearners = learnerIds.filter(id => !groupedLearners.has(id));
        return Object.assign(
          {},
          classroom,
          {
            learnerGroups: learnerGroupCollection.models.filter(g => g.parent === classroom.id)
              .map(g => g.id),
            ungroupedLearners,
          }
        );
      })
    );
    dispatch('ADD_LEARNERS', learnerCollection.models);
  });
}

module.exports = {
  addClassroom,
  setSelectedClassroomId,
  setSelectedGroupId,
  fetch,
  createUser,
  deleteUser,
};
