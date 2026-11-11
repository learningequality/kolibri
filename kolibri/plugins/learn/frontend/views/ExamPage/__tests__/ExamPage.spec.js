import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import { createTranslator } from 'kolibri/utils/i18n';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import store from '../../../store';
import { ClassesPageNames, PageNames } from '../../../constants';
import ExamPage from '../index.vue';

const { previousQuestion$, nextQuestion$ } = createTranslator(ExamPage.name, ExamPage.$trs);

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');

const PREVIOUS_QUIZ = { id: 'previous-quiz', title: 'Previous quiz' };

async function renderExamPage(examId, state = { exam: PREVIOUS_QUIZ, questions: [] }) {
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
  store.commit('examViewer/SET_STATE', state);
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

  describe('when the focused question button is disabled by the move', () => {
    const QUESTIONS = ['q1', 'q2', 'q3'].map(item => ({ item, exercise_id: item }));
    const QUIZ = {
      id: 'quiz',
      title: 'Quiz',
      question_count: QUESTIONS.length,
      question_sources: [{ section_title: 'Section 1', questions: QUESTIONS }],
    };

    async function moveTo(from, to) {
      pageLoading.value = false;
      await renderExamPage(QUIZ.id, { exam: QUIZ, questions: QUESTIONS, questionNumber: from });
      const nav = {
        previous: screen.getByRole('button', { name: previousQuestion$() }),
        next: screen.getByRole('button', { name: nextQuestion$() }),
      };
      (to < from ? nav.previous : nav.next).focus();
      store.commit('examViewer/SET_STATE', { questionNumber: to });
      await nextTick();
      return nav;
    }

    it('moves focus to Next when Previous reaches the first question', async () => {
      const { next } = await moveTo(1, 0);
      expect(next).toHaveFocus();
    });

    it('moves focus to Previous when Next reaches the last question', async () => {
      const { previous } = await moveTo(1, 2);
      expect(previous).toHaveFocus();
    });

    it('keeps focus on Next when the next question is not the last', async () => {
      const { next } = await moveTo(0, 1);
      expect(next).toHaveFocus();
    });
  });
});
