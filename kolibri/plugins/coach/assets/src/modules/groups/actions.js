import uniq from 'lodash/uniq';
import { LearnerGroupResource, MembershipResource } from 'kolibri.resources';

function _groupState(group) {
  return {
    id: group.id,
    name: group.name,
    users: [],
  };
}

export function displayModal(store, modalName) {
  store.commit('SET_GROUP_MODAL', modalName);
}

export function createGroup(store, { groupName, classId }) {
  return LearnerGroupResource.saveModel({
    data: {
      parent: classId,
      name: groupName,
    },
  }).then(
    group => {
      const groups = store.state.groups;
      groups.push(_groupState(group));

      // Clear cache for future fetches
      LearnerGroupResource.clearCache();

      store.commit('SET_GROUPS', groups);
      // We have updated the groups, so update the classSummary
      // to get that back up to date!
      return store.dispatch('classSummary/refreshClassSummary', null, { root: true });
    },
    error => store.dispatch('handleError', error, { root: true })
  );
}

export function renameGroup(store, { groupId, newGroupName }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  return LearnerGroupResource.saveModel({
    id: groupId,
    data: { name: newGroupName },
    exists: true,
  }).then(
    () => {
      const groups = store.state.groups;
      const groupIndex = groups.findIndex(group => group.id === groupId);
      groups[groupIndex].name = newGroupName;
      store.commit('SET_GROUPS', groups);
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
      store.commit('SET_GROUP_MODAL', '');
    },
    error => store.dispatch('handleError', error, { root: true })
  );
}

export function deleteGroup(store, groupId) {
  return LearnerGroupResource.deleteModel({ id: groupId }).then(
    () => {
      const groups = store.state.groups;
      const updatedGroups = groups.filter(group => group.id !== groupId);
      store.commit('SET_GROUPS', updatedGroups);
    },
    error => store.dispatch('handleError', error, { root: true })
  );
}

function _addMultipleUsersToGroup(store, groupId, userIds) {
  return new Promise((resolve, reject) => {
    MembershipResource.saveCollection({
      getParams: {
        collection: groupId,
      },
      data: uniq(userIds).map(userId => ({
        collection: groupId,
        user: userId,
      })),
    }).then(
      () => {
        const groups = Array(...store.state.groups);
        const groupIndex = groups.findIndex(group => group.id === groupId);

        userIds.forEach(userId => {
          const userObject = store.state.classUsers.find(user => user.id === userId);
          groups[groupIndex].users.push(userObject);
        });

        // Clear cache for future fetches
        LearnerGroupResource.clearCache();

        store.commit('SET_GROUPS', groups);
        resolve();
      },
      error => reject(error)
    );
  });
}

function _removeMultipleUsersFromGroup(store, groupId, userIds) {
  return new Promise((resolve, reject) => {
    MembershipResource.deleteCollection({
      user_ids: userIds,
      collection: groupId,
    }).then(
      () => {
        const groups = Array(...store.state.groups);
        const groupIndex = groups.findIndex(group => group.id === groupId);
        groups[groupIndex].users = groups[groupIndex].users.filter(
          user => !userIds.includes(user.id)
        );

        // Clear cache for future fetches
        LearnerGroupResource.clearCache();

        store.commit('SET_GROUPS', groups);
        resolve();
      },
      error => reject(error)
    );
  });
}

export function addUsersToGroup(store, { groupId, userIds }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  const final = () => {
    store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
    store.commit('SET_GROUP_MODAL', '');
  };
  return _addMultipleUsersToGroup(store, groupId, userIds)
    .catch(error => store.dispatch('handleError', error, { root: true }))
    .then(final, final);
}

export function removeUsersFromGroup(store, { groupId, userIds }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  const final = () => {
    store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
    store.commit('SET_GROUP_MODAL', '');
  };
  return _removeMultipleUsersFromGroup(store, groupId, userIds)
    .catch(error => store.dispatch('handleError', error, { root: true }))
    .then(final, final);
}
