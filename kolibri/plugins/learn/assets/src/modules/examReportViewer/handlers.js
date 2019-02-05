import { getExamReport } from 'kolibri.utils.exams';
import router from 'kolibri.coreVue.router';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { canViewExamReport } from '../../utils/exams';
import { ClassesPageNames } from '../../constants';

export function showExamReport(store, params) {
  const { classId, examId, questionNumber, questionInteraction } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_REPORT_VIEWER);

  const userId = store.getters.currentUserId;
  const examReportPromise = getExamReport(
    store,
    examId,
    userId,
    questionNumber,
    questionInteraction
  );
  ConditionalPromise.all([examReportPromise]).then(
    ([examReport]) => {
      if (canViewExamReport(examReport.exam, examReport.examLog)) {
        store.commit('examReportViewer/SET_STATE', examReport);
        store.commit('CORE_SET_ERROR', null);
        store.commit('CORE_SET_PAGE_LOADING', false);
      } else {
        router.replace({
          name: ClassesPageNames.CLASS_ASSIGNMENTS,
          params: { classId },
        });
      }
    },
    () =>
      router.replace({
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        params: { classId },
      })
  );
}
