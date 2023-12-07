import { ExamResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import { examsState } from '../examShared/exams';

export function showExamsPage(store, classId) {
  store.dispatch('loading');
  store.commit('SET_PAGE_NAME', PageNames.EXAMS);

  const promises = [
    store.dispatch('initClassInfo', classId),
    ExamResource.fetchCollection({
      getParams: { collection: classId },
      force: true,
    }),
    // state.classList needs to be set for Copy Exam modal to work
    store.dispatch('setClassList', store.state.classSummary.facility_id),
  ];

  if (store.getters.isSuperuser && store.state.core.facilities.length === 0) {
    promises.push(store.dispatch('getFacilities').catch(() => {}));
  }

  const shouldResolve = samePageCheckGenerator(store);

  return Promise.all(promises).then(
    ([exams]) => {
      if (shouldResolve()) {
        store.commit('examsRoot/SET_STATE', {
          exams: examsState(exams),
          examsModalSet: false,
          busy: false,
        });
        store.dispatch('clearError');
        store.dispatch('notLoading');
      }
    },
    error =>
      shouldResolve() ? store.dispatch('handleApiError', { error, reloadOnReconnect: true }) : null
  );
}
