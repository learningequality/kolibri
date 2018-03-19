import { PageNames } from '../../constants';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { ClassroomResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('classListTitles', {
  classListPageTitle: 'Classes',
});

function _classState(classData) {
  return {
    id: classData.id,
    name: classData.name,
    memberCount: classData.learner_count,
  };
}

export function setClassState(store, classId = null) {
  return ClassroomResource.getCollection()
    .fetch()
    .then(classes => {
      let className = null;
      if (classId) {
        className = classes.find(classroom => classroom.id === classId).name;
      }
      store.dispatch('SET_CLASS_INFO', classId, className, classes.map(_classState));
    });
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
