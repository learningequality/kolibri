import ClassroomResource from 'kolibri-common/apiResources/ClassroomResource';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import useFacility from 'kolibri-common/composables/useFacility';

export function showClassesPage(store) {
  store.dispatch('preparePage');
  store.commit('classManagement/SET_STATE', { dataLoading: true });
  const { facilityId } = useFacility();

  return ClassroomResource.fetchCollection({
    getParams: { parent: facilityId.value },
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
      handleApiError({ error, reloadOnReconnect: true });
      store.commit('classManagement/SET_STATE', { dataLoading: false });
    });
}
