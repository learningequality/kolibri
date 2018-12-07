import { ClassroomResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';

export function showClassesPage(store) {
  store.dispatch('preparePage', {
    name: PageNames.CLASS_MGMT_PAGE,
  });
  const facilityId = store.getters.currentFacilityId;
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
