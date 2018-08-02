import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { LearnerGroupResource, FacilityUserResource } from 'kolibri.resources';
import { PageNames } from '../../constants';

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

export function showGroupsPage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.GROUPS);
  const promises = [
    FacilityUserResource.fetchCollection({
      getParams: { member_of: classId },
      force: true,
    }),
    LearnerGroupResource.fetchCollection({
      getParams: { parent: classId },
      force: true,
    }),
    store.dispatch('setClassState', classId),
  ];
  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([classUsers, groupsCollection]) => {
      const groups = _groupsState(groupsCollection);
      const groupUsersPromises = groups.map(group =>
        FacilityUserResource.fetchCollection({
          getParams: { member_of: group.id },
          force: true,
        })
      );

      ConditionalPromise.all(groupUsersPromises).only(
        samePageCheckGenerator(store),
        groupsUsersCollection => {
          groupsUsersCollection.forEach((groupUsers, index) => {
            groups[index].users = _usersState(groupUsers);
          });
          store.commit('groups/SET_STATE', {
            classUsers: _usersState(classUsers),
            groups,
            groupModalShown: false,
          });
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
        },
        error => store.dispatch('handleError', error)
      );
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}
