import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
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
  const shouldResolve = samePageCheckGenerator(store);
  return Promise.all(promises).then(
    ([classUsers, groupsCollection]) => {
      if (shouldResolve()) {
        const groups = groupsCollection.map(group => ({ ...group, users: [] }));
        const groupUsersPromises = groups.map(group =>
          FacilityUserResource.fetchCollection({
            getParams: { member_of: group.id },
            force: true,
          })
        );

        Promise.all(groupUsersPromises).then(
          groupsUsersCollection => {
            if (shouldResolve()) {
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
            }
          },
          error => (shouldResolve() ? store.dispatch('handleError', error) : null)
        );
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}
