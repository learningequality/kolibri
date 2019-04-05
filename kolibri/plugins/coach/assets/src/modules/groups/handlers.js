import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { LearnerGroupResource, FacilityUserResource } from 'kolibri.resources';

export function showGroupsPage(store, classId) {
  store.dispatch('loading');
  const promises = [
    FacilityUserResource.fetchCollection({
      getParams: { member_of: classId },
      force: true,
    }),
    LearnerGroupResource.fetchCollection({
      getParams: { parent: classId },
      force: true,
    }),
  ];
  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([classUsers, groupsCollection]) => {
      const groups = groupsCollection.map(group => ({ ...group, users: [] }));
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
            groups[index].users = [...groupUsers];
          });
          store.commit('groups/SET_STATE', {
            classUsers: [...classUsers],
            groups,
            groupModalShown: false,
          });
          store.dispatch('notLoading');
          store.dispatch('clearError');
        },
        error => store.dispatch('handleError', error)
      );
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}
