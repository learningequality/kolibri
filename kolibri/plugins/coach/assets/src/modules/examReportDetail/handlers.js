import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import { getExamReport } from 'kolibri.utils.exams';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';

const translator = createTranslator('ExamReportPageTitles', {
  examReportTitle: '{examTitle} report',
});

export function showExamReportDetailPage(store, params) {
  const { classId, userId, examId, question, interaction } = params;
  // idk what this is for
  if (store.state.pageName !== PageNames.EXAM_REPORT_DETAIL) {
    store.dispatch('loading');
    store.commit('SET_PAGE_NAME', PageNames.EXAM_REPORT_DETAIL);
  }
  const promises = [getExamReport(store, examId, userId, question, interaction)];
  ConditionalPromise.all(promises).then(
    ([examReport]) => {
      store.commit('examReportDetail/SET_STATE', examReport);
      store.commit('SET_TOOLBAR_ROUTE', { name: PageNames.EXAM_REPORT });
      store.dispatch('clearError');
      store.commit(
        'SET_TOOLBAR_TITLE',
        translator.$tr('examReportTitle', {
          examTitle: examReport.exam.title,
        })
      );
      store.dispatch('notLoading');
    },
    () =>
      router.replace({
        name: PageNames.EXAM_REPORT,
        params: { classId, examId },
      })
  );
}
