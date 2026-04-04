import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import { pageLoading } from '../../composables/usePageLoading';

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
      pageLoading.value = false;
      store.commit('classManagement/SET_STATE', { dataLoading: false });
    })
    .catch(error => {
      pageLoading.value = false;
      store.dispatch('handleApiError', { error, reloadOnReconnect: true });
      store.commit('classManagement/SET_STATE', { dataLoading: false });
    });
}
