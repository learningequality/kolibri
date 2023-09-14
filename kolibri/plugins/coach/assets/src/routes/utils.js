import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';

export function classIdParamRequiredGuard(toRoute, subtopicName) {
  if (!toRoute.params.classId) {
    const redirectPage = store.getters.userIsMultiFacilityAdmin
      ? 'AllFacilitiesPage'
      : 'CoachClassListPage';

    router.replace({
      name: redirectPage,
      params: { subtopicName },
    });
    return true;
  }
}
