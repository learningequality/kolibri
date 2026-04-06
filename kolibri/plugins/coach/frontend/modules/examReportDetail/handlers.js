import { getExamReport } from 'kolibri-common/quizzes/utils';
import { createTranslator } from 'kolibri/utils/i18n';
import store from 'kolibri/store';
import { handleApiError } from 'kolibri/utils/appError';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';

const translator = createTranslator('ExamReportPageTitles', {
  examReportTitle: {
    message: '{examTitle} report',
    context: 'Indicates the name of the report.',
  },
});

export function generateExamReportDetailHandler(paramsToCheck) {
  return function showExamReportDetailPage({ params }, from) {
    const { learnerId, quizId, questionId, interactionIndex, tryIndex } = params;
    const fromParams = from.params;
    const setLoading = paramsToCheck.some(param => params[param] !== fromParams[param]);
    if (setLoading) {
      // Only set loading state if we are not switching between
      // different views of the same learner's exercise report.
      pageLoading.value = true;
    }
    getExamReport(quizId, tryIndex, questionId, interactionIndex)
      .then(examReport => {
        store.commit('examReportDetail/SET_STATE', {
          ...examReport,
          learnerId,
          pageTitle: translator.$tr('examReportTitle', {
            examTitle: examReport.exam.title,
          }),
        });
        pageLoading.value = false;
      })
      .catch(error => {
        pageLoading.value = false;
        return handleApiError({ error, reloadOnReconnect: true });
      });
  };
}
