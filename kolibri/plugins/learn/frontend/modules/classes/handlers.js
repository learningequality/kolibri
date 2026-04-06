import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import { LearnerClassroomResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  pageLoading.value = true;
  return LearnerClassroomResource.fetchCollection()
    .then(classrooms => {
      store.commit('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
      store.commit('classes/SET_LEARNER_CLASSROOMS', classrooms);
      pageLoading.value = false;
    })
    .catch(error => {
      pageLoading.value = false;
      handleApiError({ error, reloadOnReconnect: true });
    });
}
