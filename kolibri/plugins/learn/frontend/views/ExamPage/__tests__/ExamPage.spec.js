import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import router from 'kolibri/router';
import useUser from 'kolibri/composables/useUser';
import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import store from '../../../store';
import { ClassesPageNames, PageNames } from '../../../constants';
import { showExam } from '../../../modules/examViewer/handlers';
import ExamPage from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const { previousQuestion$, nextQuestion$, question$ } = createTranslator(
  ExamPage.name,
  ExamPage.$trs,
);
const { questionNumberLabel$ } = coreStrings;
const examName = ClassesPageNames.EXAM_VIEWER;
const heldEnter = () =>
  new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
describe('quiz question navigation', () => {
  let vueRouter;

  const originalWidth = window.innerWidth;

  beforeAll(() => {
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    trackInputModality();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    vueRouter = router.initRoutes([
      { name: PageNames.HOME, path: '/' },
      {
        name: examName,
        path: '/classes/:classId/exam/:examId/:questionNumber',
        handler(to, from) {
          showExam(store, to.params, from.params.examId === to.params.examId, to);
        },
      },
      { name: ClassesPageNames.CLASS_ASSIGNMENTS, path: '/classes/:classId' },
    ]);
  });

  afterAll(() => {
    window.innerWidth = originalWidth;
    window.dispatchEvent(new Event('resize'));
  });

  let contentNodes;
  let responseDelay;

  beforeEach(() => {
    contentNodes = [];
    responseDelay = 0;
    useUser().setSession({ session: { user_id: 'learner' } });
    urls.__echoUrls();
    client.mockImplementation(async ({ url: path }) => {
      let data;
      if (path.startsWith('/kolibri:core:exam_detail/')) {
        data = {
          id: path.split('/').pop(),
          title: 'Quiz',
          data_model_version: 3,
          learners_see_fixed_order: true,
          question_count: 3,
          question_sources: [
            {
              section_title: 'Section 1',
              learners_see_fixed_order: true,
              questions: [1, 2, 3].map(question_id => ({ exercise_id: 'exercise', question_id })),
            },
          ],
        };
      } else if (path.startsWith('/kolibri:kolibri.plugins.learn:learnerclassroom_detail/')) {
        data = { id: 'class-id' };
      } else if (path === '/kolibri:core:contentnode_list') {
        data = contentNodes;
      } else if (path === '/kolibri:core:trackprogress_list') {
        data = {};
      } else {
        throw new Error(`Unexpected request to ${path}`);
      }
      await new Promise(resolve => setTimeout(resolve, responseDelay));
      return { data };
    });
  });

  let quizId = 0;

  async function renderQuiz(questionNumber) {
    await router.push({
      name: examName,
      params: { classId: 'class-id', examId: `quiz-${++quizId}`, questionNumber },
    });
    render(ExamPage, {
      store,
      router: vueRouter,
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: { render: h => h('div'), methods: { checkAnswer: () => null } } },
    });
    await expectQuestion(questionNumber + 1);
  }

  async function expectQuestion(num) {
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: question$({ num, total: 3 }) })).toBeVisible();
    });
  }

  async function activate(button, key = '{Enter}') {
    button.focus();
    await userEvent.keyboard(key);
  }

  it.each([
    [false, 1, 1, previousQuestion$, nextQuestion$, '{Enter}'],
    [false, 1, 3, nextQuestion$, previousQuestion$, '[Space]'],
    [true, 1, 3, nextQuestion$, previousQuestion$, '{Enter}'],
    [false, 0, 2, nextQuestion$, nextQuestion$, '{Enter}'],
  ])(
    'with exercise available %s, moves from index %i to question %i and preserves focus',
    async (available, from, to, used, focused, key) => {
      if (available) {
        contentNodes = [{ id: 'exercise', kind: 'exercise', title: 'Exercise' }];
      }
      await renderQuiz(from);
      const button = screen.getByRole('button', { name: used() });
      const setAttribute = button.setAttribute.bind(button);
      const disable = jest.spyOn(button, 'setAttribute').mockImplementation((name, value) => {
        setAttribute(name, value);
        if (name === 'disabled') {
          button.blur();
        }
      });
      try {
        await activate(button, key);
        await expectQuestion(to);
      } finally {
        disable.mockRestore();
      }
      expect(screen.getByRole('button', { name: focused() })).toHaveFocus();
    },
  );

  it.each([
    [nextQuestion$, previousQuestion$, 3],
    [previousQuestion$, nextQuestion$, 1],
  ])(
    'keeps keyboard modality when focus is handed off after the keyboard window',
    async (used, focused, to) => {
      await renderQuiz(1);
      responseDelay = 400;
      await activate(screen.getByRole('button', { name: used() }));
      await expectQuestion(to);
      expect(screen.getByRole('button', { name: focused() })).toHaveFocus();
      expect(document.body).toHaveAttribute('modality', 'keyboard');
    },
  );

  it.each([
    [nextQuestion$, previousQuestion$, 3],
    [previousQuestion$, nextQuestion$, 1],
  ])('ignores a held Enter on the button focus is handed to', async (used, focused, to) => {
    await renderQuiz(1);
    screen.getByRole('button', { name: used() }).focus();
    await userEvent.keyboard('{Enter>}');
    await expectQuestion(to);
    const target = screen.getByRole('button', { name: focused() });
    expect(target).toHaveFocus();
    expect(target.dispatchEvent(heldEnter())).toBe(false);
    await userEvent.keyboard('{/Enter}');
    await userEvent.keyboard('{Enter}');
    await expectQuestion(2);
  });

  it('keeps the activated question entry focused and current', async () => {
    await renderQuiz(0);
    const entry = screen.getByRole('button', {
      name: questionNumberLabel$({ questionNumber: 2 }),
    });
    await activate(entry);
    await expectQuestion(2);
    expect(entry).toHaveFocus();
    expect(entry).toBeEnabled();
    expect(entry).toHaveAttribute('aria-current', 'step');
  });
});
