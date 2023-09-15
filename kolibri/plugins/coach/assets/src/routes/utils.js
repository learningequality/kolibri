import store from 'kolibri.coreVue.vuex.store';

export function classIdParamRequiredGuard(toRoute, subtopicName, next) {
  if (!toRoute.params.classId) {
    const redirectPage = store.getters.userIsMultiFacilityAdmin
      ? 'AllFacilitiesPage'
      : 'CoachClassListPage';

    next({
      name: redirectPage,
      params: { subtopicName },
    });
    return true;
  }
}
