import { LearnerClassroomResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  // Force fetch, so it doesn't re-use the assignments-less version in the cache
  return LearnerClassroomResource.fetchModel({ id: classId })
    .then(classroom => {
      store.commit('SET_PAGE_NAME', ClassesPageNames.CLASS_ASSIGNMENTS);
      store.commit('classAssignments/SET_CURRENT_CLASSROOM', classroom);
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return store.dispatch('handleApiError', error);
    });
}
