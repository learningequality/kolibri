import { getExamReport } from 'kolibri.utils.exams';
import router from 'kolibri.coreVue.router';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import { ClassesPageNames } from '../../constants';

export function showExamReport(store, params) {
  const { classId, examId, tryIndex, questionNumber, questionInteraction } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_REPORT_VIEWER);

  const examReportPromise = getExamReport(examId, tryIndex, questionNumber, questionInteraction);
  ConditionalPromise.all([examReportPromise]).then(
    ([examReport]) => {
      store.commit('examReportViewer/SET_STATE', examReport);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    () =>
      router.replace({
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        params: { classId },
      })
  );
}
