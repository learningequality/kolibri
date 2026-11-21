import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../store';
import { ClassesPageNames, PageNames } from '../../constants';
import LearnExamReportViewer, { pageTitleStrings } from '../LearnExamReportViewer';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const PREVIOUS_QUIZ = { id: 'previous-quiz', title: 'Previous quiz' };

async function renderReport(examId) {
  const router = new VueRouter({
    routes: [
      { path: '/', name: PageNames.HOME },
      {
        name: ClassesPageNames.EXAM_REPORT_VIEWER,
        path: '/classes/:classId/examReport/:examId/:tryIndex/:questionNumber/:questionInteraction',
      },
    ],
  });
  await router.push({
    name: ClassesPageNames.EXAM_REPORT_VIEWER,
    params: { classId: 'class-id', examId, tryIndex: 0, questionNumber: 0, questionInteraction: 0 },
  });
  store.commit('examReportViewer/SET_STATE', { exam: PREVIOUS_QUIZ });
  render({ render: h => h(LearnExamReportViewer) }, { store, router });
}

describe('LearnExamReportViewer', () => {
  beforeEach(() => {
    pageLoading.value = true;
  });

  const previousTitle = () => pageTitleStrings.documentTitle$({ examTitle: PREVIOUS_QUIZ.title });

  it('renders no heading for the previous quiz while the next report loads', async () => {
    await renderReport('next-quiz');
    expect(screen.queryByRole('heading', { name: previousTitle() })).not.toBeInTheDocument();
  });

  it('renders the h1 for the stored quiz when its report is the one opened', async () => {
    await renderReport(PREVIOUS_QUIZ.id);
    expect(screen.getByRole('heading', { level: 1, name: previousTitle() })).toBeInTheDocument();
  });
});
