import { ClassroomResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';

export function showClassesPage(store, toRoute) {
  store.dispatch('preparePage');
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  const shouldResolve = samePageCheckGenerator(store);
  return ClassroomResource.fetchCollection({
    getParams: { parent: facilityId },
    force: true,
  }).then(
    classrooms => {
      if (shouldResolve()) {
        store.commit('classManagement/SET_STATE', {
          modalShown: false,
          classes: [...classrooms],
        });
        store.commit('CORE_SET_PAGE_LOADING', false);
      }
    },
    error => {
      shouldResolve() ? store.dispatch('handleError', error) : null;
    }
  );
}
