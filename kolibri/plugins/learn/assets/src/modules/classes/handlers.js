import { ClassroomResource } from 'kolibri.resources';
import { ClassesPageNames } from '../../constants';

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);

  return ClassroomResource.fetchCollection()
    .then(classrooms => {
      store.commit('SET_PAGE_NAME', ClassesPageNames.ALL_CLASSES);
      store.commit('classes/SET_LEARNER_CLASSROOMS', classrooms);
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return store.dispatch('handleApiError', error);
    });
}
