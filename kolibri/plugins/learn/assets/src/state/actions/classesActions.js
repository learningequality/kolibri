import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  store.dispatch('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
  return LearnerClassroomResource.getCollection({ no_assignments: true })
    .fetch()
    .then(classrooms => {
      store.dispatch('SET_PAGE_STATE', {
        classrooms: [...classrooms],
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  store.dispatch('SET_PAGE_NAME', ClassesPageNames.CLASS_ASSIGNMENTS);
  // Force fetch, so it doesn't re-use the assignments-less version in the cache
  return LearnerClassroomResource.getModel(classId)
    .fetch({}, true)
    ._promise.then(classroom => {
      store.dispatch('SET_PAGE_STATE', {
        currentClassroom: { ...classroom },
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      // TODO Handle 404
      console.log(error); // eslint-disable-line
    });
}
