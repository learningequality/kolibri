import { ClassroomResource } from 'kolibri.resources';

export function showClassesPage(store, toRoute) {
  store.dispatch('preparePage');
  store.commit('classManagement/SET_STATE', { dataLoading: true });
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  return ClassroomResource.fetchCollection({
    getParams: { parent: facilityId },
    force: true,
  })
    .then(classrooms => {
      store.commit('classManagement/SET_STATE', {
        modalShown: false,
        classes: [...classrooms],
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('classManagement/SET_STATE', { dataLoading: false });
    })
    .catch(error => {
      store.dispatch('handleError', error);
      store.commit('classManagement/SET_STATE', { dataLoading: false });
    });
}
