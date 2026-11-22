import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import { createTranslator } from 'kolibri/utils/i18n';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import AnswerHistory from '../AnswerHistory.vue';
import QuizRenderer from '../index.vue';

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

describe('QuizRenderer', () => {
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

  const { question$: heading } = createTranslator(QuizRenderer.name, QuizRenderer.$trs);

  async function renderNavigation() {
    render(QuizRenderer, {
      props: { content, userId: 'learner-id', updateContentSession: jest.fn() },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: ContentViewerStub },
    });
    const entry = await screen.findByRole('button', { name: question$({ num: 2 }) });
    const next = screen.getByRole('button', { name: NEXT });
    const previous = screen.getByRole('button', {
      name: QuizRenderer.$trs.previousQuestion.message,
    });
    return { entry, next, previous };
  }

  it('hands off footer focus and keeps the activated entry focused', async () => {
    const { entry, next, previous } = await renderNavigation();
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
    ['Next', 3, 2],
    ['Previous', 1, 2],
  ])('ignores a held Enter on the button that %s hands focus to', async (used, boundary, back) => {
    const { next, previous } = await renderNavigation();
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
    expect(screen.getByRole('heading', { name: heading({ num: back, total: 3 }) })).toBeVisible();
  });

  it.each([
    ['Next', 'Previous'],
    ['Previous', 'Next'],
  ])('keeps keyboard modality when %s hands focus to %s after the keyboard window', async used => {
    const { next, previous } = await renderNavigation();
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
  });

  it.each([
    [true, 1],
    [false, 0.5],
  ])('saves an answer with isSurvey %s as correct %s', async (isSurvey, correct) => {
    const updateContentSession = jest.fn().mockResolvedValue();
    render(QuizRenderer, {
      props: { content, userId: 'learner-id', isSurvey, updateContentSession },
      // eslint-disable-next-line kolibri/tests-no-stubs
      stubs: { ContentViewer: ContentViewerStub },
    });
    await fireEvent.click(screen.getByRole('button', { name: ANSWER }));
    await fireEvent.click(screen.getByRole('button', { name: NEXT }));
    expect(updateContentSession).toHaveBeenCalledWith(
      expect.objectContaining({ interaction: expect.objectContaining({ correct }) }),
    );
  });
});
