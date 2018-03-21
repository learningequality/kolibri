import { PageNames } from '../../constants';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { ClassroomResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('classListTitles', {
  classListPageTitle: 'Classes',
});

/**
 * Checks how many Classrooms the Coach user is assigned to and provides data to
 * redirect to appropriate landing page. This function is run before the default
 * handler for '/coach/'.
 *
 */
export function shouldRedirectToClassRootPage() {
  return ClassroomResource.getCollection({ role: 'coach' })
    .fetch()
    ._promise.then(classrooms => {
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
      store.dispatch('SET_CLASS_INFO', {
        classId,
        currentClassroom: classId && classrooms.find(({ id }) => id === classId),
        classList: [...classrooms],
      });
    })
    .catch(error => handleApiError(store, error));
}

export function showClassListPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.CLASS_LIST);
  return setClassState(store).then(
    () => {
      store.dispatch('SET_PAGE_STATE', {});
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('classListPageTitle'));
    },
    error => handleApiError(store, error)
  );
}

export function setSelectedAttemptLogIndex(store, index) {
  store.dispatch('SET_SELECTED_ATTEMPT_LOG_INDEX', index);
}
