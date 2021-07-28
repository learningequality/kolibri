import { LearnerClassroomResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  return store.dispatch('loading').then(() => {
    return LearnerClassroomResource.fetchCollection()
      .then(classrooms => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
        store.commit('classes/SET_LEARNER_CLASSROOMS', classrooms);
        store.dispatch('notLoading');
      })
      .catch(error => {
        if (error instanceof Error) {
          return store.dispatch('handleApiError', error);
        }

        // Allows triggering of AuthMessage.vue
        return store.dispatch('handleError', error);
      });
  });
}

// Shows a list of all the Learners in a given class and their sync statuses
export function showAllLearnersInClass(store) {
  return store.dispatch('loading').then(() => {
    return LearnerClassroomResource.fetchCollection()
      .then(() => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.LEARNER_SYNC_STATUS_VIEWER);
        store.dispatch('notLoading');
      })
      .catch(error => {
        if (error instanceof Error) {
          return store.dispatch('handleApiError', error);
        }

        // Allows triggering of AuthMessage.vue
        return store.dispatch('handleError', error);
      });
  });
}
