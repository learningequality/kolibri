import { ref } from 'vue';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import LearnerGroupResource from 'kolibri-common/apiResources/LearnerGroupResource';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';
import { handleApiError, clearError } from 'kolibri/utils/appError';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

// Place outside the function to keep the state
const groupsAreLoading = ref(false);
const { fetchFacilities, facilities } = useFacilities();

export function useGroups() {
  function setGroupsLoading(loading) {
    groupsAreLoading.value = loading;
  }

  async function showGroupsPage(store, classId, route) {
    const initClassInfoPromise = store.dispatch('initClassInfo', classId);
    const fetchFacilitiesPromise =
      useUser().isSuperuser.value && facilities.value.length === 0
        ? fetchFacilities().catch(() => {})
        : Promise.resolve();

    await Promise.all([initClassInfoPromise, fetchFacilitiesPromise]);
    pageLoading.value = false;

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
    const shouldResolve = samePageCheckGenerator(route);
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
                clearError();
              }
            },
            error => (shouldResolve() ? handleApiError({ error, reloadOnReconnect: true }) : null),
          );
        }
      },
      error => {
        shouldResolve() ? handleApiError({ error, reloadOnReconnect: true }) : null;
      },
    );
  }

  return {
    groupsAreLoading,
    showGroupsPage,
  };
}
