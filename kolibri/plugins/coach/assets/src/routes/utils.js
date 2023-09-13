import store from 'kolibri.coreVue.vuex.store';
import router from 'kolibri.coreVue.router';

export function classIdParamRequiredGuard(toRoute, subtopicName) {
  if (!toRoute.params.classId) {
    if (store.getters.userIsMultiFacilityAdmin) {
      router.replace({
        name: 'AllFacilitiesPage',
        params: { subtopicName },
      });
      return true;
    } else {
      router.replace({
        name: 'CoachClassListPage',
        params: { subtopicName },
      });
    }
  }
}
