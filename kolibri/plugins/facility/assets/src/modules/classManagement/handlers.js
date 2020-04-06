import { ClassroomResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';

export function showClassesPage(store, toRoute) {
  store.dispatch('preparePage');
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  return ClassroomResource.fetchCollection({
    getParams: { parent: facilityId },
    force: true,
  }).only(
    samePageCheckGenerator(store),
    classrooms => {
      store.commit('classManagement/SET_STATE', {
        modalShown: false,
        classes: [...classrooms],
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('handleApiError', error);
    }
  );
}
