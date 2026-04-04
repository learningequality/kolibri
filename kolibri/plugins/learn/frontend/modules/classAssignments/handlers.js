import useLearnerResources from '../../composables/useLearnerResources';
import { pageLoading } from '../../composables/usePageLoading';
import { ClassesPageNames } from '../../constants';

const { fetchClass } = useLearnerResources();

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  pageLoading.value = true;
  return fetchClass({ classId })
    .then(() => {
      store.commit('SET_PAGE_NAME', ClassesPageNames.CLASS_ASSIGNMENTS);
      pageLoading.value = false;
    })
    .catch(error => {
      pageLoading.value = false;
      return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
    });
}
