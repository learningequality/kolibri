import { LearnerClassroomResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  return store.dispatch('loading').then(() => {
    return LearnerClassroomResource.fetchModel({ id: classId })
      .then(classroom => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.CLASS_ASSIGNMENTS);
        store.commit('classAssignments/SET_CURRENT_CLASSROOM', classroom);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}
