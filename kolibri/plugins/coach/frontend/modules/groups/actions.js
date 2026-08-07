import uniq from 'lodash/uniq';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import MembershipResource from 'kolibri-common/apiResources/MembershipResource';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

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
  return LearnerGroupResource.create({
    parent: classId,
    name: groupName,
  }).then(
    group => {
      const groups = store.state.groups;
      groups.push(_groupState(group));

      store.commit('SET_GROUPS', groups);
      // We have updated the groups, so update the classSummary
      // to get that back up to date!
      return store.dispatch('classSummary/refreshClassSummary', null, { root: true });
    },
    error => handleApiError({ error }),
  );
}

export function renameGroup(store, { groupId, newGroupName }) {
  pageLoading.value = true;
  return LearnerGroupResource.update(groupId, { name: newGroupName }).then(
    () => {
      const groups = store.state.groups;
      const groupIndex = groups.findIndex(group => group.id === groupId);
      groups[groupIndex].name = newGroupName;
      store.commit('SET_GROUPS', groups);
      pageLoading.value = false;
      store.commit('SET_GROUP_MODAL', '');
    },
    error => {
      pageLoading.value = false;
      handleApiError({ error });
    },
  );
}

export function deleteGroup(store, groupId) {
  return LearnerGroupResource.delete(groupId).then(
    () => {
      const groups = store.state.groups;
      const updatedGroups = groups.filter(group => group.id !== groupId);
      store.commit('SET_GROUPS', updatedGroups);
    },
    error => handleApiError({ error }),
  );
}

function _addMultipleUsersToGroup(store, groupId, userIds) {
  return new Promise((resolve, reject) => {
    MembershipResource.bulkCreate(
      uniq(userIds).map(userId => ({
        collection: groupId,
        user: userId,
      })),
    ).then(
      () => {
        const groups = Array(...store.state.groups);
        const groupIndex = groups.findIndex(group => group.id === groupId);

        userIds.forEach(userId => {
          const userObject = store.state.classUsers.find(user => user.id === userId);
          groups[groupIndex].users.push(userObject);
        });

        store.commit('SET_GROUPS', groups);
        resolve();
      },
      error => reject(error),
    );
  });
}

function _removeMultipleUsersFromGroup(store, groupId, userIds) {
  return new Promise((resolve, reject) => {
    MembershipResource.bulkDelete({
      user_ids: userIds,
      collection: groupId,
    }).then(
      () => {
        const groups = Array(...store.state.groups);
        const groupIndex = groups.findIndex(group => group.id === groupId);
        groups[groupIndex].users = groups[groupIndex].users.filter(
          user => !userIds.includes(user.id),
        );

        store.commit('SET_GROUPS', groups);
        resolve();
      },
      error => reject(error),
    );
  });
}

export function addUsersToGroup(store, { groupId, userIds }) {
  pageLoading.value = true;
  const final = () => {
    pageLoading.value = false;
    store.commit('SET_GROUP_MODAL', '');
  };
  return _addMultipleUsersToGroup(store, groupId, userIds)
    .catch(error => {
      handleApiError({ error });
    })
    .then(final, final);
}

export function removeUsersFromGroup(store, { groupId, userIds }) {
  pageLoading.value = true;
  const final = () => {
    pageLoading.value = false;
    store.commit('SET_GROUP_MODAL', '');
  };
  return _removeMultipleUsersFromGroup(store, groupId, userIds)
    .catch(error => {
      handleApiError({ error });
    })
    .then(final, final);
}
