import { getExamReport } from 'kolibri.utils.exams';
import { createTranslator } from 'kolibri.utils.i18n';
import store from 'kolibri.coreVue.vuex.store';

const translator = createTranslator('ExamReportPageTitles', {
  examReportTitle: '{examTitle} report',
});

export function generateExamReportDetailHandler(paramsToCheck) {
  return function showExamReportDetailPage({ params }, from) {
    const { learnerId, quizId, questionId, interactionIndex } = params;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same learner's exercise report.
      store.dispatch('loading');
    }
    getExamReport(store, quizId, learnerId, questionId, interactionIndex).then(examReport => {
      store.commit('examReportDetail/SET_STATE', {
        ...examReport,
        learnerId,
        pageTitle: translator.$tr('examReportTitle', {
          examTitle: examReport.exam.title,
        }),
      });
      store.dispatch('notLoading');
    });
  };
}
