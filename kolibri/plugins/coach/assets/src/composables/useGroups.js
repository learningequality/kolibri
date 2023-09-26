import { ref } from 'kolibri.lib.vueCompositionApi';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { LearnerGroupResource, FacilityUserResource } from 'kolibri.resources';

// Place outside the function to keep the state
const groupsAreLoading = ref(false);

export function useGroups() {
  function setGroupsLoading(loading) {
    groupsAreLoading.value = loading;
  }

  function showGroupsPage(store, classId) {
    // On this page, handle loading state locally
    // TODO: Open follow-up so that we don't need to do this
    store.dispatch('notLoading');

    setGroupsLoading(true);

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
                setGroupsLoading(false);
                store.dispatch('clearError');
              }
            },
            error =>
              shouldResolve()
                ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
                : null
          );
        }
      },
      error => {
        shouldResolve()
          ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
          : null;
      }
    );
  }

  return {
    groupsAreLoading,
    showGroupsPage,
  };
}
