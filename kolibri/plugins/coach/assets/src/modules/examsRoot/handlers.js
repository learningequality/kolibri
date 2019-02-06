import { ExamResource } from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import { examsState } from '../examShared/exams';

export function showExamsPage(store, classId) {
  store.dispatch('loading');
  store.commit('SET_PAGE_NAME', PageNames.EXAMS);

  const promises = [
    ExamResource.fetchCollection({
      getParams: { collection: classId },
      force: true,
    }),
    // state.classList needs to be set for Copy Exam modal to work
    store.dispatch('setClassList'),
  ];

  return ConditionalPromise.all(promises).only(
    samePageCheckGenerator(store),
    ([exams]) => {
      store.commit('examsRoot/SET_STATE', {
        exams: examsState(exams),
        examsModalSet: false,
        busy: false,
      });
      store.dispatch('clearError');
      store.dispatch('notLoading');
    },
    error => store.dispatch('handleError', error)
  );
}
