import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { PageNames } from '../../constants';

export function showCreateExamPage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.CREATE_EXAM);
  store.commit('examCreate/SET_STATE', {
    examsModalSet: false,
    exerciseContentNodes: [],
    exercises: [],
    selectedExercises: [],
    subtopics: [],
    topic: {},
  });

  const goToTopLevelPromise = store.dispatch('examCreate/goToTopLevel');

  ConditionalPromise.all([store.dispatch('setClassState', classId), goToTopLevelPromise]).only(
    samePageCheckGenerator(store),
    () => {
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => store.dispatch('handleError', error)
  );
}
