import * as coreActions from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import * as Constants from '../../constants';
import { setClassState } from './main';

import { LearnerGroupResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';

function _userState(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
  };
}

function _usersState(users) {
  return users.map(user => _userState(user));
}

function _groupState(group) {
  return {
    id: group.id,
    name: group.name,
    users: [],
  };
}

function _groupsState(groups) {
  return groups.map(group => _groupState(group));
}

function displayModal(store, modalName) {
  store.dispatch('SET_GROUP_MODAL', modalName);
}

function showGroupsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.GROUPS);

  const facilityPromise = FacilityUserResource.getCurrentFacility();
  const classUsersPromise = FacilityUserResource.getCollection({
    member_of: classId,
  }).fetch({}, true);
  const groupPromise = LearnerGroupResource.getCollection({
    parent: classId,
  }).fetch({}, true);

  ConditionalPromise.all([
    facilityPromise,
    classUsersPromise,
    groupPromise,
    setClassState(store, classId),
  ]).only(
    coreActions.samePageCheckGenerator(store),
    ([facility, classUsers, groupsCollection]) => {
      const groups = _groupsState(groupsCollection);
      const groupUsersPromises = groups.map(group =>
        FacilityUserResource.getCollection({ member_of: group.id }).fetch({}, true)
      );

      ConditionalPromise.all(groupUsersPromises).only(
        coreActions.samePageCheckGenerator(store),
        groupsUsersCollection => {
          groupsUsersCollection.forEach((groupUsers, index) => {
            groups[index].users = _usersState(groupUsers);
          });

          const pageState = {
            classUsers: _usersState(classUsers),
            groups,
            groupModalShown: false,
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

function createGroup(store, groupName) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const groupPayload = {
    parent: store.state.classId,
    name: groupName,
  };
  LearnerGroupResource.createModel(groupPayload).save().then(
    group => {
      const groups = store.state.pageState.groups;
      groups.push(_groupState(group));

      // Clear cache for future fetches
      LearnerGroupResource.clearCache();

      store.dispatch('SET_GROUPS', groups);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      displayModal(store, false);
    },
    error => coreActions.handleError(store, error)
  );
}

function renameGroup(store, groupId, newGroupName) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  const groupPayload = {
    name: newGroupName,
  };
  LearnerGroupResource.getModel(groupId).save(groupPayload).then(
    () => {
      const groups = store.state.pageState.groups;
      const groupIndex = groups.findIndex(group => group.id === groupId);
      groups[groupIndex].name = newGroupName;

      store.dispatch('SET_GROUPS', groups);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => coreActions.handleError(store, error)
  );
}

function deleteGroup(store, groupId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  LearnerGroupResource.getModel(groupId).delete().then(
    () => {
      const groups = store.state.pageState.groups;
      const updatedGroups = groups.filter(group => group.id !== groupId);

      store.dispatch('SET_GROUPS', updatedGroups);
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
        const groups = store.state.pageState.groups;
        const groupIndex = groups.findIndex(group => group.id === groupId);
        const userObject = store.state.pageState.classUsers.find(user => user.id === userId);
        groups[groupIndex].users.push(userObject);

        // Clear cache for future fetches
        LearnerGroupResource.clearCache();

        store.dispatch('SET_GROUPS', groups);
        resolve();
      },
      error => reject(error)
    );
  });
}

function _addMultipleUsersToGroup(store, groupId, userIds) {
  const addPromises = userIds.map(userId => _addUserToGroup(store, groupId, userId));

  return new Promise((resolve, reject) => {
    Promise.all(addPromises).then(() => resolve(), error => reject(error));
  });
}

function _removeUserfromGroup(store, groupId, userId) {
  const membershipPayload = {
    collection_id: groupId,
    user_id: userId,
  };
  return new Promise((resolve, reject) => {
    MembershipResource.getCollection(membershipPayload).fetch().then(membership => {
      const membershipId = membership[0].id; // will always only have one item in the array.
      MembershipResource.getModel(membershipId).delete().then(
        () => {
          const groups = store.state.pageState.groups;
          const groupIndex = groups.findIndex(group => group.id === groupId);
          groups[groupIndex].users = groups[groupIndex].users.filter(user => user.id !== userId);

          // Clear cache for future fetches
          LearnerGroupResource.clearCache();

          store.dispatch('SET_GROUPS', groups);
          resolve();
        },
        error => reject(error)
      );
    });
  });
}

function _removeMultipleUsersFromGroup(store, groupId, userIds) {
  const removePromises = userIds.map(userId => _removeUserfromGroup(store, groupId, userId));

  return new Promise((resolve, reject) => {
    Promise.all(removePromises).then(() => resolve(), error => reject(error));
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

export {
  displayModal,
  showGroupsPage,
  createGroup,
  renameGroup,
  deleteGroup,
  addUsersToGroup,
  removeUsersFromGroup,
  moveUsersBetweenGroups,
};
