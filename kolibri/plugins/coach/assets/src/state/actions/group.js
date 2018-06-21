import { handleError, samePageCheckGenerator } from 'kolibri.coreVue.vuex.actions';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { LearnerGroupResource, MembershipResource, FacilityUserResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import { setClassState, handleCoachPageError } from './main';

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
  store.dispatch('SET_GROUP_MODAL', modalName);
}

export function showGroupsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.GROUPS);
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
          store.dispatch('SET_PAGE_STATE', {
            classUsers: _usersState(classUsers),
            groups,
            groupModalShown: false,
          });
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', translator.$tr('groupManagementPageTitle'));
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
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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

        store.dispatch('SET_GROUPS', groups);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        displayModal(store, false);
      },
      error => handleError(store, error)
    );
}

export function renameGroup(store, groupId, newGroupName) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return LearnerGroupResource.getModel(groupId)
    .save({ name: newGroupName })
    .then(
      () => {
        const groups = store.state.pageState.groups;
        const groupIndex = groups.findIndex(group => group.id === groupId);
        groups[groupIndex].name = newGroupName;
        store.dispatch('SET_GROUPS', groups);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
        this.displayModal(false);
      },
      error => handleError(store, error)
    );
}

export function deleteGroup(store, groupId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return LearnerGroupResource.getModel(groupId)
    .delete()
    .then(
      () => {
        const groups = store.state.pageState.groups;
        const updatedGroups = groups.filter(group => group.id !== groupId);

        store.dispatch('SET_GROUPS', updatedGroups);
        store.dispatch('CORE_SET_PAGE_LOADING', false);
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

          store.dispatch('SET_GROUPS', groups);
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

          store.dispatch('SET_GROUPS', groups);
          resolve();
        },
        error => reject(error)
      );
  });
}

export function addUsersToGroup(store, groupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return _addMultipleUsersToGroup(store, groupId, userIds)
    .catch(error => handleError(store, error))
    .finally(() => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    });
}

export function removeUsersFromGroup(store, groupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return _removeMultipleUsersFromGroup(store, groupId, userIds)
    .catch(error => handleError(store, error))
    .finally(() => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    });
}

export function moveUsersBetweenGroups(store, currentGroupId, newGroupId, userIds) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return _removeMultipleUsersFromGroup(store, currentGroupId, userIds)
    .then(() => {
      return _addMultipleUsersToGroup(store, newGroupId, userIds);
    })
    .catch(error => handleError(store, error))
    .finally(() => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      this.displayModal(false);
    });
}
