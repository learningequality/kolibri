import { ClassroomResource } from 'kolibri.resources';
import { PageNames } from '../../constants';

/**
 * Checks how many Classrooms the Coach user is assigned to and provides data to
 * redirect to appropriate landing page. This function is run before the default
 * handler for '/coach/'.
 *
 */
export function shouldRedirectToClassRootPage() {
  return ClassroomResource.getCollection({ role: 'coach' })
    .fetch()
    .then(classrooms => {
      if (classrooms.length === 1) {
        return classrooms[0].id;
      }
      return false;
    });
}

export function setClassState(store, classId = null) {
  return ClassroomResource.getCollection({ role: 'coach' })
    .fetch()
    .then(classrooms => {
      store.commit('SET_CLASS_INFO', {
        classId,
        currentClassroom: classId && classrooms.find(({ id }) => id === classId),
        classList: [...classrooms],
      });
    })
    .catch(error => store.dispatch('handleApiError', error));
}

export function showClassListPage(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.CLASS_LIST);
  return setClassState(store).then(
    () => {
      store.commit('SET_PAGE_STATE', {});
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => store.dispatch('handleApiError', error)
  );
}

export function setSelectedAttemptLogIndex(store, index) {
  store.commit('SET_SELECTED_ATTEMPT_LOG_INDEX', index);
}

/**
  * Handle coach page errors.
  * The status code errors that's related to the authentication issue, most not show
    in coach page beacuse there's an `auth-message` that explain the error.
**/
export function handleCoachPageError(store, errorObject) {
  const authErrorCodes = [401, 403, 404, 407];
  if (authErrorCodes.includes(errorObject.status.code)) {
    store.dispatch('handleError', '');
  } else {
    store.dispatch('handleError', errorObject);
  }
}
