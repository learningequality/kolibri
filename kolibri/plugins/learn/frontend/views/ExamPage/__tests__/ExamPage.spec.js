import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../../store';
import { ClassesPageNames, PageNames } from '../../../constants';
import ExamPage from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');

const PREVIOUS_QUIZ = { id: 'previous-quiz', title: 'Previous quiz' };

async function renderExamPage(examId) {
  const router = new VueRouter({
    routes: [
      { path: '/', name: PageNames.HOME },
      {
        name: ClassesPageNames.EXAM_VIEWER,
        path: '/classes/:classId/exam/:examId/:questionNumber',
      },
      { name: ClassesPageNames.CLASS_ASSIGNMENTS, path: '/classes/:classId' },
    ],
  });
  await router.push({
    name: ClassesPageNames.EXAM_VIEWER,
    params: { classId: 'class-id', examId, questionNumber: 0 },
  });
  store.commit('examViewer/SET_STATE', { exam: PREVIOUS_QUIZ, questions: [] });
  render({ render: h => h(ExamPage) }, { store, router });
}

describe('ExamPage', () => {
  beforeEach(() => {
    pageLoading.value = true;
  });

  it('renders no heading for the previous quiz while the next one loads', async () => {
    await renderExamPage('next-quiz');
    expect(screen.queryByRole('heading', { name: PREVIOUS_QUIZ.title })).not.toBeInTheDocument();
  });

  it('renders the h1 for the stored quiz when it is the one opened', async () => {
    await renderExamPage(PREVIOUS_QUIZ.id);
    expect(
      screen.getByRole('heading', { level: 1, name: PREVIOUS_QUIZ.title }),
    ).toBeInTheDocument();
  });
});
