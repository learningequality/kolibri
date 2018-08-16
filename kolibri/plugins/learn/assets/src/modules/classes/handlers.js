import { ClassroomResource } from 'kolibri.resources';
import { ClassesPageNames } from '../../constants';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  return store.dispatch('loading').then(() => {
    return ClassroomResource.fetchCollection()
      .then(classrooms => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
        store.commit('classes/SET_LEARNER_CLASSROOMS', classrooms);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}
