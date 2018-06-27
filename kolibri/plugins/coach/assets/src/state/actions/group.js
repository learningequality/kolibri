import { handleError, samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import logger from 'kolibri.lib.logging';
import { LearnerGroupResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { setClassState, handleCoachPageError } from './main';

const logging = logger.getLogger(__filename);

const translator = createTranslator('groupManagementPageTitles', {
  groupManagementPageTitle: 'Groups',
});

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

// TODO rename to 'setGroupsModal' per 'setExamsModal'
export function displayModal(store, modalName) {
  store.commit('SET_GROUP_MODAL', modalName);
}

export function showGroupsPage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.GROUPS);
  const promises = [
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true),
    LearnerGroupResource.getCollection({ parent: classId }).fetch({}, true),
    FacilityUserResource.getCurrentFacility(),
    setClassState(store, classId),
  ];
  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([classUsers, groupsCollection]) => {
      const groups = _groupsState(groupsCollection);
      const groupUsersPromises = groups.map(group =>
        FacilityUserResource.getCollection({ member_of: group.id }).fetch({}, true)
      );

      ConditionalPromise.all(groupUsersPromises).only(
        samePageCheckGenerator(store),
        groupsUsersCollection => {
          groupsUsersCollection.forEach((groupUsers, index) => {
            groups[index].users = _usersState(groupUsers);
          });
          store.commit('SET_PAGE_STATE', {
            classUsers: _usersState(classUsers),
            groups,
            groupModalShown: false,
          });
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
          store.commit('CORE_SET_TITLE', translator.$tr('groupManagementPageTitle'));
        },
        error => handleError(store, error)
      );
    },
    error => {
      handleCoachPageError(store, error);
    }
  );
}

export function createGroup(store, groupName) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  return LearnerGroupResource.createModel({
    parent: store.state.classId,
    name: groupName,
  })
    .save()
    .then(
      group => {
        const groups = store.state.pageState.groups;
        groups.push(_groupState(group));

        // Clear cache for future fetches
        LearnerGroupResource.clearCache();

        store.commit('SET_GROUPS', groups);
        store.commit('CORE_SET_PAGE_LOADING', false);
        displayModal(store, false);
      },
      error => handleError(store, error)
    );
}

export function renameGroup(store, { groupId, newGroupName }) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  return LearnerGroupResource.getModel(groupId)
    .save({ name: newGroupName })
    .then(
      () => {
        const groups = store.state.pageState.groups;
        const groupIndex = groups.findIndex(group => group.id === groupId);
        groups[groupIndex].name = newGroupName;
        store.commit('SET_GROUPS', groups);
        store.commit('CORE_SET_PAGE_LOADING', false);
        this.displayModal(false);
      },
      error => handleError(store, error)
    );
}

export function deleteGroup(store, groupId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  return LearnerGroupResource.getModel(groupId)
    .delete()
    .then(
      () => {
        const groups = store.state.pageState.groups;
        const updatedGroups = groups.filter(group => group.id !== groupId);

        store.commit('SET_GROUPS', updatedGroups);
        store.commit('CORE_SET_PAGE_LOADING', false);
        this.displayModal(false);
      },
      error => handleError(store, error)
    );
}

function _addMultipleUsersToGroup(store, groupId, userIds) {
  const memberships = userIds.map(userId => ({
    collection: groupId,
    user: userId,
  }));

  return new Promise((resolve, reject) => {
    MembershipResource.createCollection(
      {
        collection: groupId,
      },
      memberships
    )
      .save()
      .then(
        () => {
          const groups = Array(...store.state.pageState.groups);
          const groupIndex = groups.findIndex(group => group.id === groupId);

          userIds.forEach(userId => {
            const userObject = store.state.pageState.classUsers.find(user => user.id === userId);
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
    MembershipResource.getCollection({
      user_ids: userIds,
      collection: groupId,
    })
      .delete()
      .then(
        () => {
          const groups = Array(...store.state.pageState.groups);
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
  store.commit('CORE_SET_PAGE_LOADING', true);
  return _addMultipleUsersToGroup(store, groupId, userIds).then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => logging.error(error)
  );
}

export function removeUsersFromGroup(store, { groupId, userIds }) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  return _removeMultipleUsersFromGroup(store, groupId, userIds).then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => logging.error(error)
  );
}

export function moveUsersBetweenGroups(store, { currentGroupId, newGroupId, userIds }) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  const promises = [
    _removeMultipleUsersFromGroup(store, currentGroupId, userIds),
    _addMultipleUsersToGroup(store, newGroupId, userIds),
  ];
  return Promise.all(promises).then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    },
    error => logging.error(error)
  );
}
