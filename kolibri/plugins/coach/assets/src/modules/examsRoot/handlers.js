import { ExamResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import { _examsState } from '../shared/exams';

export function showExamsPage(store, classId) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.EXAMS);

  const promises = [
    ExamResource.fetchCollection({
      getParams: { collection: classId },
      force: true,
    }),
    store.dispatch('setClassState', classId),
  ];

  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([exams]) => {
      store.commit('examsRoot/SET_STATE', {
        exams: _examsState(exams),
        examsModalSet: false,
        busy: false,
      });
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => store.dispatch('handleError', error)
  );
}
