import { ref } from 'vue';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';

// Place outside the function to keep the state
const groupsAreLoading = ref(false);

export function useGroups() {
  function setGroupsLoading(loading) {
    groupsAreLoading.value = loading;
  }

  async function showGroupsPage(store, classId) {
    const initClassInfoPromise = store.dispatch('initClassInfo', classId);
    const getFacilitiesPromise =
      useUser().isSuperuser.value && store.state.core.facilities.length === 0
        ? store.dispatch('getFacilities').catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, getFacilitiesPromise]);
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
            }),
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
                : null,
          );
        }
      },
      error => {
        shouldResolve()
          ? store.dispatch('handleApiError', { error, reloadOnReconnect: true })
          : null;
      },
    );
  }

  return {
    groupsAreLoading,
    showGroupsPage,
  };
}
