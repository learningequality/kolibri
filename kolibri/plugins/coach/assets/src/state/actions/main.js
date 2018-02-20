import * as Constants from '../../constants';
import * as coreActions from 'kolibri.coreVue.vuex.actions';
import { ClassroomResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const name = 'classListTitles';

const messages = {
  classListPageTitle: 'Classes',
};

const translator = createTranslator(name, messages);

// ================================
// CLASS LIST ACTIONS

function _classState(classData) {
  return {
    id: classData.id,
    name: classData.name,
    memberCount: classData.learner_count,
  };
}

function setClassState(store, classId = null) {
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

function showClassListPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.CLASS_LIST);
  setClassState(store).then(
    () => {
      store.dispatch('SET_PAGE_STATE', {});
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', translator.$tr('classListPageTitle'));
    },
    error => {
      coreActions.handleApiError(store, error);
    }
  );
}

// - - - - - Action for Coach Exercise Render Page - - - - - -

function setSelectedAttemptLogIndex(store, index) {
  store.dispatch('SET_SELETED_ATTEMPTLOG_INDEX', index);
}

export { setClassState, showClassListPage, setSelectedAttemptLogIndex };
