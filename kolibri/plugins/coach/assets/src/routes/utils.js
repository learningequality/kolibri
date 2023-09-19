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
    store.commit('CORE_SET_PAGE_LOADING', false);
    return true;
  }
}
