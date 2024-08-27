import store from 'kolibri.coreVue.vuex.store';
import useUser from 'kolibri.coreVue.composables.useUser';
import { get } from '@vueuse/core';

export function classIdParamRequiredGuard(toRoute, subtopicName, next) {
  if (!toRoute.params.classId) {
    const { userIsMultiFacilityAdmin } = useUser();
    const redirectPage = get(userIsMultiFacilityAdmin) ? 'AllFacilitiesPage' : 'CoachClassListPage';

    next({
      name: redirectPage,
      params: { subtopicName },
    });
    store.commit('CORE_SET_PAGE_LOADING', false);
    return true;
  }
}
