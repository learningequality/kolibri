import { getExamReport } from 'kolibri-common/quizzes/utils';
import router from 'kolibri/router';
import { ClassesPageNames } from '../../constants';

function getExamReportFromState(state, params) {
  const {
    examReportViewer: {
      exam: { id: stateExamId } = {},
      questions = [],
      exerciseContentNodes = [],
    } = {},
  } = state;

  const { examId, questionNumber, tryIndex, questionInteraction } = params;

  if (stateExamId !== examId) {
    return null;
  }

  const exercise = exerciseContentNodes.find(
    node => node.id === questions[questionNumber].exercise_id,
  );
  if (!exercise) {
    return null;
  }

  return {
    ...state.examReportViewer,
    exercise,
    tryIndex: Number(tryIndex),
    questionNumber: Number(questionNumber),
    interactionIndex: Number(questionInteraction),
  };
}

export function showExamReport(store, params) {
  const { classId, examId, tryIndex, questionNumber, questionInteraction } = params;
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_REPORT_VIEWER);

  const examReportFromState = getExamReportFromState(store.state, params);
  if (examReportFromState) {
    store.commit('examReportViewer/SET_STATE', examReportFromState);
    store.commit('CORE_SET_ERROR', null);
    return;
  }

  store.commit('CORE_SET_PAGE_LOADING', true);
  const examReportPromise = getExamReport(examId, tryIndex, questionNumber, questionInteraction);
  Promise.all([examReportPromise]).then(
    ([examReport]) => {
      store.commit('examReportViewer/SET_STATE', examReport);
      store.commit('CORE_SET_ERROR', null);
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    () =>
      router.replace({
        name: ClassesPageNames.CLASS_ASSIGNMENTS,
        params: { classId },
      }),
  );
}
