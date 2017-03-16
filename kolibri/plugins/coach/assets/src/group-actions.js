const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const Constants = require('./state/constants');

const LearnerGroupResource = coreApp.resources.LearnerGroupResource;
const MembershipResource = coreApp.resources.MembershipResource;
const FacilityUserResource = coreApp.resources.FacilityUserResource;
const ClassroomResource = coreApp.resources.ClassroomResource;


function displayModal(store, modalName) {
  store.dispatch('SET_MODAL', modalName);
}

function showGroupsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_GROUPS_PAGE);

  const facilityPromise = FacilityUserResource.getCurrentFacility();
  const classPromise = ClassroomResource.getModel(classId).fetch();
  const classUsersPromise =
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true);
  const groupPromise = LearnerGroupResource.getCollection({ parent: classId }).fetch();

  ConditionalPromise.all([facilityPromise, classPromise, classUsersPromise, groupPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([facility, classModel, classUsers, groups]) => {
      const groupUsersPromises = groups.map(group =>
        FacilityUserResource.getCollection({ member_of: group.id }).fetch({}, true));
      ConditionalPromise.all(groupUsersPromises).only(
        coreActions.samePageCheckGenerator(store),
        groupsUsers => {
          groups.forEach((group, index) => {
            groups[index].users = groupsUsers[index];
          });
          const pageState = {
            facilityId: facility[0],
            class: classModel,
            classUsers,
            groups,
            modalShown: false,
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', 'Groups');
        },
        error => coreActions.handleError(store, error)
      );
    },
    error => coreActions.handleError(store, error)
  );
}

function createGroup(store, classId, groupName) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const groupPayload = {
    parent: classId,
    name: groupName,
  };
  LearnerGroupResource.createModel(groupPayload).save().then(
    group => {
      group.users = []; // pass in an empty array
      store.dispatch('ADD_GROUP', group);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      displayModal(store, false);
    },
    error => coreActions.handleError(store, error)
  );
}

function renameGroup(store, classId, groupId, newGroupName) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const groupPayload = {
    name: newGroupName,
  };
  LearnerGroupResource.getModel(groupId).save(groupPayload).then(
    () => {
      store.dispatch('RENAME_GROUP', groupId, newGroupName);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => coreActions.handleError(store, error)
  );
}

function deleteGroup(store, classId, groupId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  LearnerGroupResource.getModel(groupId).delete().then(
    () => {
      store.dispatch('DELETE_GROUP', groupId);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => coreActions.handleError(store, error)
  );
}

function _addUserToGroup(store, groupId, userId) {
  const membershipPayload = {
    collection: groupId,
    user: userId,
  };
  return new Promise((resolve, reject) => {
    MembershipResource.createModel(membershipPayload).save().then(
      () => {
        store.dispatch('ADD_USER_TO_GROUP', groupId, userId);
        resolve();
      },
      error => reject(error)
    );
  });
}

function _addMultipleUsersToGroup(store, groupId, userIds) {
  const addPromises = userIds.map(userId => _addUserToGroup(store, groupId, userId));

  return new Promise((resolve, reject) => {
    Promise.all(addPromises).then(
      () => resolve(),
      error => reject(error)
    );
  });
}

function _removeUserfromGroup(store, groupId, userId) {
  const membershipPayload = {
    collection_id: groupId,
    user_id: userId,
  };
  return new Promise((resolve, reject) => {
    MembershipResource.getCollection(membershipPayload).fetch().then(
      membership => {
        const membershipId = membership[0].id; // will always only have one item in the array.
        MembershipResource.getModel(membershipId).delete().then(
          () => {
            store.dispatch('REMOVE_USER_FROM_GROUP', groupId, userId);
            resolve();
          },
          error => reject(error)
        );
      }
    );
  });
}

function _removeMultipleUsersFromGroup(store, groupId, userIds) {
  const removePromises = userIds.map(userId => _removeUserfromGroup(store, groupId, userId));

  return new Promise((resolve, reject) => {
    Promise.all(removePromises).then(
      () => resolve(),
      error => reject(error)
    );
  });
}

function addUsersToGroup(store, groupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _addMultipleUsersToGroup(store, groupId, userIds).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => error(error)
  );
}

function removeUsersFromGroup(store, groupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _removeMultipleUsersFromGroup(store, groupId, userIds).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => error(error)
  );
}

function moveUsersBetweenGroups(store, currentGroupId, newGroupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const removeUsersPromise = _removeMultipleUsersFromGroup(store, currentGroupId, userIds);
  const addUsersPromise = _addMultipleUsersToGroup(store, newGroupId, userIds);
  Promise.all([removeUsersPromise, addUsersPromise]).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => error(error)
  );
}


module.exports = {
  displayModal,
  showGroupsPage,
  createGroup,
  renameGroup,
  deleteGroup,
  addUsersToGroup,
  removeUsersFromGroup,
  moveUsersBetweenGroups,
};
