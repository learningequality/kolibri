import { LearnerClassroomResource } from '../../apiResources';
import { pageLoading } from '../../composables/usePageLoading';
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
      if (error instanceof Error) {
        return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
      }

      // Allows triggering of AuthMessage.vue
      return store.dispatch('handleError', { error, reloadOnReconnect: true });
    });
}
