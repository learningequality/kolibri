import { ClassroomResource } from 'kolibri.resources';
import { PageNames } from '../../constants';

/**
 * Checks how many Classrooms the Coach user is assigned to and provides data to
 * redirect to appropriate landing page. This function is run before the default
 * handler for '/coach/'.
 *
 */
export function shouldRedirectToClassRootPage() {
  return ClassroomResource.fetchCollection({ getParams: { role: 'coach' } }).then(classrooms => {
    if (classrooms.length === 1) {
      return classrooms[0].id;
    }
    return false;
  });
}

export function showClassListPage(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.CLASS_LIST);
  return store.dispatch('setClassState').then(
    () => {
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}
