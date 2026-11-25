import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { createTranslator } from 'kolibri/utils/i18n';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import ResourceLayout from '../../../ResourceLayout/index.vue';
import AnswerHistory from '../AnswerHistory.vue';
import QuizRenderer from '../index.vue';
import PrePostTestRenderer from '../../PrePostTestRenderer/index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const LEARNER_NAME = 'Learner name';

const content = {
  id: 'quiz-id',
  content_id: 'quiz-content-id',
  title: 'Quiz',
  kind: 'exercise',
  options: {},
  assessmentmetadata: { assessment_item_ids: ['item-1', 'item-2', 'item-3'] },
};

const { question$ } = createTranslator(AnswerHistory.name, AnswerHistory.$trs);
const ANSWER = 'Answer';
const NEXT = QuizRenderer.$trs.nextQuestion.message;
const heldEnter = () =>
  new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });

// ContentViewer is globally registered, so a stub is the only seam for its answer.
const ContentViewerStub = {
  name: 'ContentViewer',
  methods: {
    checkAnswer() {
      return { correct: 0.5, answerState: { response: 'Ana' } };
    },
  },
  template: `<button @click="$emit('interaction')">${ANSWER}</button>`,
};

async function renderQuiz(props, renderer = QuizRenderer, nested = false) {
  const innerProps = { content, userId: 'learner-id', userFullName: LEARNER_NAME, ...props };
  const component = nested
    ? { render: h => h(ResourceLayout, [h(renderer, { props: innerProps })]) }
    : renderer;
  render(component, {
    props: nested ? {} : innerProps,
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: { ContentViewer: ContentViewerStub },
  });
  await flushPromises();
}

// CourseUnitView renders the course title as the page's h1.
describe('course QuizRenderer', () => {
  beforeEach(() => {
    urls.__echoUrls();
    // QuizReport fetches the latest try's diff and the list of past tries.
    const currentTry = { attemptlogs: [], complete: true, end_timestamp: new Date() };
    client.mockImplementation(({ url }) =>
      Promise.resolve({ data: url.includes('diff') ? currentTry : [currentTry] }),
    );
  });

  it('renders no h1 while in progress', async () => {
    await renderQuiz({ mastered: false });
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
  });

  it('renders the report heading below the h1 once finished', async () => {
    await renderQuiz({ mastered: true });
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2, name: LEARNER_NAME })).toBeInTheDocument();
  });

  const originalWidth = window.innerWidth;
  beforeAll(() => {
    window.innerWidth = 1440;
    window.dispatchEvent(new Event('resize'));
    trackInputModality();
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  afterAll(() => {
    window.innerWidth = originalWidth;
    window.dispatchEvent(new Event('resize'));
  });

  const prePostProps = {
    masteryCriterion: { type: 'pre_post_test', version: 'A' },
    content: {
      ...content,
      options: {
        completion_criteria: {
          threshold: { pre_post_test: { version_a_item_ids: ['item-1', 'item-2', 'item-3'] } },
        },
      },
    },
  };

  async function renderNavigation(renderer, props) {
    await renderQuiz(
      { mastered: false, ...props, updateContentSession: jest.fn().mockResolvedValue() },
      renderer,
      true,
    );
    const entry = await screen.findByRole('button', { name: question$({ num: 2 }) });
    const next = screen.getByRole('button', { name: NEXT });
    const previous = screen.getByRole('button', { name: renderer.$trs.previousQuestion.message });
    return { entry, next, previous };
  }

  it.each([
    ['quiz', QuizRenderer, {}],
    ['survey', QuizRenderer, { isSurvey: true }],
    ['pre/post test', PrePostTestRenderer, prePostProps],
  ])('preserves keyboard focus in a course %s', async (_label, renderer, props) => {
    const { entry, next, previous } = await renderNavigation(renderer, props);
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(next).toBeDisabled();
    expect(previous).toHaveFocus();
    await userEvent.keyboard('[Space]');
    expect(previous).toHaveFocus();
    await userEvent.keyboard('[Space]');
    expect(previous).toBeDisabled();
    expect(next).toHaveFocus();
    entry.focus();
    await userEvent.keyboard('{Enter}');
    expect(entry).toHaveFocus();
    expect(entry).toBeEnabled();
    expect(screen.getByRole('button', { current: 'step' })).toBe(entry);
  });

  it.each([
    ['quiz', 'Next', QuizRenderer, {}, 3],
    ['quiz', 'Previous', QuizRenderer, {}, 1],
    ['survey', 'Next', QuizRenderer, { isSurvey: true }, 3],
    ['pre/post test', 'Next', PrePostTestRenderer, prePostProps, 3],
    ['pre/post test', 'Previous', PrePostTestRenderer, prePostProps, 1],
  ])(
    'ignores a held Enter in a course %s on the button that %s hands focus to',
    async (_label, used, renderer, props, boundary) => {
      const { question$: heading } = createTranslator(renderer.name, renderer.$trs);
      const { next, previous } = await renderNavigation(renderer, props);
      const [button, target] = used === 'Next' ? [next, previous] : [previous, next];
      next.focus();
      await userEvent.keyboard('{Enter}');
      button.focus();
      await userEvent.keyboard('{Enter>}');
      await flushPromises();
      expect(target).toHaveFocus();
      expect(target.dispatchEvent(heldEnter())).toBe(false);
      await userEvent.keyboard('{/Enter}');
      expect(
        screen.getByRole('heading', { name: heading({ num: boundary, total: 3 }) }),
      ).toBeVisible();
      await userEvent.keyboard('{Enter}');
      expect(screen.getByRole('heading', { name: heading({ num: 2, total: 3 }) })).toBeVisible();
    },
  );

  it.each([
    ['quiz', QuizRenderer, {}, 'Next'],
    ['quiz', QuizRenderer, {}, 'Previous'],
    ['pre/post test', PrePostTestRenderer, prePostProps, 'Next'],
    ['pre/post test', PrePostTestRenderer, prePostProps, 'Previous'],
  ])(
    'keeps keyboard modality in a course %s when %s hands off focus after the keyboard window',
    async (_label, renderer, props, used) => {
      const { next, previous } = await renderNavigation(renderer, props);
      const [button, target] = used === 'Next' ? [next, previous] : [previous, next];
      const user = userEvent.setup();
      next.focus();
      await user.keyboard('{Enter}');
      button.focus();
      await user.keyboard('[Space>]');
      await new Promise(resolve => setTimeout(resolve, 400));
      await user.keyboard('[/Space]');
      await flushPromises();
      expect(button).toBeDisabled();
      expect(target).toHaveFocus();
      expect(document.body).toHaveAttribute('modality', 'keyboard');
    },
  );

  it.each([
    [true, 1],
    [false, 0.5],
  ])('saves an answer with isSurvey %s as correct %s', async (isSurvey, correct) => {
    const updateContentSession = jest.fn().mockResolvedValue();
    await renderQuiz({ mastered: false, isSurvey, updateContentSession });
    await fireEvent.click(screen.getByRole('button', { name: ANSWER }));
    await fireEvent.click(screen.getByRole('button', { name: NEXT }));
    expect(updateContentSession).toHaveBeenCalledWith(
      expect.objectContaining({ interaction: expect.objectContaining({ correct }) }),
    );
  });
});
