import { ExamResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';
import { examsState } from '../examShared/exams';

export async function showExamsPage(store, classId) {
  store.dispatch('loading');
  store.commit('SET_PAGE_NAME', PageNames.EXAMS);

  const initClassInfoPromise = store.dispatch('initClassInfo', classId);
  const getFacilitiesPromise =
    store.getters.isSuperuser && store.state.core.facilities.length === 0
      ? store.dispatch('getFacilities').catch(() => {})
      : Promise.resolve();

  await Promise.all([initClassInfoPromise, getFacilitiesPromise]);

  const promises = [
    ExamResource.fetchCollection({
      getParams: { collection: classId },
      force: true,
    }),
    // state.classList needs to be set for Copy Exam modal to work
    store.dispatch('setClassList', store.state.classSummary.facility_id),
  ];

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
