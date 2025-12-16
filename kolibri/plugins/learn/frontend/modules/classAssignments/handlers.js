import useLearnerResources from '../../composables/useLearnerResources';
import { ClassesPageNames } from '../../constants';

const { fetchClass } = useLearnerResources();

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  return store.dispatch('loading').then(() => {
    return fetchClass({ classId })
      .then(() => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.CLASS_ASSIGNMENTS);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', { error, reloadOnReconnect: true });
      });
  });
}
