import { LearnerGroupResource } from 'kolibri.resources';
import { LessonsPageNames } from '../../constants/lessonsConstants';

// Show the Lessons Root Page, where all the Lessons are listed for a given Classroom
export function showLessonsRootPage(store, classId) {
  return store.dispatch('loading').then(() => {
    store.commit('lessonsRoot/SET_STATE', {
      lessons: [],
      learnerGroups: [],
    });
    const loadRequirements = [
      // Fetch learner groups for the New Lesson Modal
      LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
      store.dispatch('lessonsRoot/refreshClassLessons', classId),
    ];
    return Promise.all(loadRequirements).then(
      ([learnerGroups]) => {
        store.commit('lessonsRoot/SET_LEARNER_GROUPS', learnerGroups);
        store.commit('SET_PAGE_NAME', LessonsPageNames.PLAN_LESSONS_ROOT);
        store.dispatch('notLoading');
      },
      error => {
        store.dispatch('handleApiError', error);
        store.dispatch('notLoading');
      }
    );
  });
}
