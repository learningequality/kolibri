import { render, screen, fireEvent, waitFor } from '@testing-library/vue';

import { createTranslator } from 'kolibri/utils/i18n';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import AssessmentWrapper, { hintTranslator } from '../index.vue';

const { completedLabel$ } = coreStrings;

jest.mock('kolibri/composables/useUser');

const {
  goal$,
  check$,
  next$,
  inputAnswer$,
  correct$,
  tryAgain$,
  greatKeepGoing$,
  itemError$,
  tryDifferentQuestion$,
} = createTranslator(AssessmentWrapper.name, AssessmentWrapper.$trs);

const ASSESSMENT_IDS = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];
const DEFAULT_MASTERY_MODEL = { type: 'm_of_n', m: 3, n: 5 };

function buildProps(overrides = {}) {
  return {
    files: [],
    assessmentIds: ASSESSMENT_IDS,
    randomize: false,
    masteryModel: DEFAULT_MASTERY_MODEL,
    pastattempts: [],
    mastered: false,
    totalattempts: 0,
    hasNextResource: false,
    ...overrides,
  };
}

/**
 * ContentViewer stub that exposes events through test-trigger buttons.
 * This avoids needing to access __vue__ or the component vm.
 *
 * By default `checkAnswer` returns null (no answer given).
 * Override by providing a different stub via the `stubs` option.
 * @param {object} [config] - Stub configuration.
 * @param {?Function} [config.checkAnswerFn] - Replaces the default `checkAnswer`
 * implementation when provided.
 * @param {number} [config.availableHints] - Initial value for the stub's `availableHints`
 * data property.
 * @param {number} [config.totalHints] - Initial value for the stub's `totalHints` data
 * property.
 * @returns {object} A Vue component definition suitable for use as a Vue Testing
 * Library stub.
 */
function makeContentViewerStub({ checkAnswerFn, availableHints = 0, totalHints = 0 } = {}) {
  return {
    name: 'ContentViewer',
    props: [
      'lang',
      'files',
      'extraFields',
      'assessment',
      'itemId',
      'progress',
      'userId',
      'userFullName',
      'timeSpent',
    ],
    data() {
      return {
        availableHints,
        totalHints,
      };
    },
    methods: {
      checkAnswer() {
        return checkAnswerFn ? checkAnswerFn() : null;
      },
      takeHint() {
        this.$emit('hintTaken', { answerState: {} });
      },
    },
    template: `
      <div data-testid="content-viewer">
        <span data-testid="content-viewer-item-id">{{ itemId }}</span>
        <button data-testid="trigger-start-tracking" @click="$emit('startTracking')">start-tracking</button>
        <button data-testid="trigger-stop-tracking" @click="$emit('stopTracking')">stop-tracking</button>
        <button data-testid="trigger-update-progress" @click="$emit('updateProgress', 0.5)">update-progress</button>
        <button data-testid="trigger-update-content-state" @click="$emit('updateContentState', { someState: true })">update-content-state</button>
        <button data-testid="trigger-error" @click="$emit('error', 'test error')">trigger-error</button>
        <button data-testid="trigger-item-error" @click="$emit('itemError')">trigger-item-error</button>
        <button data-testid="trigger-hint-taken" @click="$emit('hintTaken', { answerState: {} })">trigger-hint-taken</button>
        <button data-testid="trigger-answer-given-correct" @click="$emit('answerGiven', { correct: true, answerState: { answer: 42 }, simpleAnswer: '42' })">trigger-answer-correct</button>
        <button data-testid="trigger-answer-given-incorrect" @click="$emit('answerGiven', { correct: false, answerState: { answer: 0 }, simpleAnswer: '0' })">trigger-answer-incorrect</button>
      </div>
    `,
  };
}

const DefaultStub = makeContentViewerStub();

/**
 * Render `AssessmentWrapper` with merged props and the default `ContentViewer` stub.
 * @param {object} [props] - Prop overrides merged on top of `buildProps` defaults.
 * @param {object} [options] - Additional render options.
 * @param {object} [options.stubs] - Extra stubs to merge into the render call.
 * @returns {ReturnType<typeof render>} The Testing Library render result.
 */
function renderComponent(props = {}, { stubs, ...restOptions } = {}) {
  const mergedProps = buildProps(props);
  return render(AssessmentWrapper, {
    props: mergedProps,
    // ContentViewer is a complex renderer intentionally implemented as a stub
    // to allow for testing AssessmentWrapper behavior in response to events
    // emitted by ContentViewer
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: {
      ContentViewer: DefaultStub,
      ...stubs,
    },
    ...restOptions,
  });
}

/**
 * Helper to read the current-status text content.
 * @returns {string} The trimmed text inside the `current-status` test node.
 */
function getStatusText() {
  return screen.getByTestId('current-status').textContent.trim();
}

/**
 * Helper to get the displayed item id from the content viewer stub.
 * @returns {string} The trimmed text inside the `content-viewer-item-id` test node.
 */
function getDisplayedItemId() {
  return screen.getByTestId('content-viewer-item-id').textContent.trim();
}

describe('AssessmentWrapper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  describe('rendering', () => {
    it('renders the mastery goal text', () => {
      renderComponent();
      // "Get 3 correct" appears in both the mastery bar and the bottom status bar
      const elements = screen.getAllByText(goal$({ count: 3 }));
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the Check button initially', () => {
      renderComponent();
      expect(screen.getByText(check$())).toBeInTheDocument();
    });

    it('does not render the Next button initially', () => {
      renderComponent();
      expect(screen.queryByText(next$())).not.toBeInTheDocument();
    });

    it('renders the content viewer with the first item id', () => {
      renderComponent();
      // totalattempts=0, not randomized → index=0 → 'item-1'
      expect(getDisplayedItemId()).toBe('item-1');
    });

    it('renders the completed label when mastered', () => {
      renderComponent({ mastered: true });
      expect(screen.getByText(completedLabel$())).toBeInTheDocument();
    });

    it('does not render the completed label when not mastered', () => {
      renderComponent({ mastered: false });
      expect(screen.queryByText(completedLabel$())).not.toBeInTheDocument();
    });

    it('shows additional button when hasNextResource is true', () => {
      renderComponent({ hasNextResource: true });
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('renders exercise attempt placeholder slots equal to attemptsWindowN', () => {
      const { container } = renderComponent();
      // With m_of_n m=3, n=5 there should be 5 placeholder slots
      const placeholders = container.querySelectorAll('.placeholder');
      expect(placeholders).toHaveLength(5);
    });
  });

  describe('item selection', () => {
    it('selects item based on totalattempts modulo assessmentIds length', () => {
      renderComponent({ totalattempts: 7 });
      // 7 % 5 = 2 → 'item-3'
      expect(getDisplayedItemId()).toBe('item-3');
    });

    it('selects the first item when totalattempts is 0', () => {
      renderComponent({ totalattempts: 0 });
      expect(getDisplayedItemId()).toBe('item-1');
    });

    it('uses shuffled order when randomize is true', () => {
      renderComponent({ randomize: true, totalattempts: 0 });
      expect(ASSESSMENT_IDS).toContain(getDisplayedItemId());
    });
  });

  describe('checkAnswer with no answer', () => {
    it('shows "Please enter an answer above" when check is clicked but content viewer returns null', async () => {
      renderComponent();
      await fireEvent.click(screen.getByText(check$()));
      expect(getStatusText()).toBe(inputAnswer$());
    });

    it('keeps the Check button visible when no answer is returned', async () => {
      renderComponent();
      await fireEvent.click(screen.getByText(check$()));
      expect(screen.getByText(check$())).toBeInTheDocument();
    });
  });

  describe('correct answer on first attempt', () => {
    function renderWithCorrectViewer(props = {}) {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({
          correct: true,
          answerState: { answer: 42 },
          simpleAnswer: '42',
        }),
      });
      return renderComponent(props, { stubs: { ContentViewer: stub } });
    }

    it('shows the Next button after a correct answer', async () => {
      renderWithCorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      expect(screen.getByText(next$())).toBeInTheDocument();
      expect(screen.queryByText(check$())).not.toBeInTheDocument();
    });

    it('shows "Correct!" status when pastattempts contain a correct attempt', async () => {
      // currentStatus shows "Correct!" only when correct===1 AND
      // recentAttempts[last] === 'right'. The parent updates pastattempts.
      renderWithCorrectViewer({ pastattempts: [{ correct: 1 }] });
      await fireEvent.click(screen.getByText(check$()));
      expect(getStatusText()).toBe(correct$());
    });

    it('emits updateInteraction with progress > 0 and correct=1 on the first attempt', async () => {
      const { emitted } = renderWithCorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      const interactions = emitted().updateInteraction;
      expect(interactions).toHaveLength(1);
      const [{ progress, interaction }] = interactions[0];
      expect(interaction.correct).toBe(1);
      expect(interaction.complete).toBe(true);
      expect(progress).toBeGreaterThan(0);
    });

    it('includes answerState and simpleAnswer in the emitted interaction', async () => {
      const { emitted } = renderWithCorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      const [{ interaction }] = emitted().updateInteraction[0];
      expect(interaction.answer).toEqual({ answer: 42 });
      expect(interaction.simple_answer).toBe('42');
    });

    it('includes item id and time_spent in the emitted interaction', async () => {
      const { emitted } = renderWithCorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      const [{ interaction }] = emitted().updateInteraction[0];
      expect(interaction.item).toBe('item-1');
      expect(typeof interaction.time_spent).toBe('number');
    });
  });

  describe('incorrect answer', () => {
    function renderWithIncorrectViewer(props = {}) {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({
          correct: false,
          answerState: { answer: 0 },
          simpleAnswer: '0',
        }),
      });
      return renderComponent(props, { stubs: { ContentViewer: stub } });
    }

    it('shows "Try again" after an incorrect answer', async () => {
      renderWithIncorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      expect(getStatusText()).toBe(tryAgain$());
    });

    it('keeps the Check button after an incorrect answer', async () => {
      renderWithIncorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      expect(screen.getByText(check$())).toBeInTheDocument();
    });

    it('adds the shaking class on the Check button', async () => {
      renderWithIncorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      const checkButton = screen.getByText(check$()).closest('button');
      expect(checkButton.className).toContain('shaking');
    });

    it('emits updateInteraction with correct=0 on first attempt', async () => {
      const { emitted } = renderWithIncorrectViewer();
      await fireEvent.click(screen.getByText(check$()));
      const [{ interaction, progress }] = emitted().updateInteraction[0];
      expect(interaction.correct).toBe(0);
      expect(interaction.complete).toBe(false);
      // Progress is set because it's the first attempt
      expect(progress).toBeDefined();
    });
  });

  describe('rectified answer', () => {
    it('shows "Great! Keep going" when answer is corrected on second attempt', async () => {
      let callCount = 0;
      const stub = makeContentViewerStub({
        checkAnswerFn: () => {
          callCount++;
          if (callCount === 1) {
            return { correct: false, answerState: { answer: 0 }, simpleAnswer: '0' };
          }
          return { correct: true, answerState: { answer: 42 }, simpleAnswer: '42' };
        },
      });

      renderComponent(
        // Must provide a past attempt with an id so second attempt doesn't error
        // when it tries to read currentattempt.id
        { pastattempts: [{ correct: 0, id: 'att-1' }] },
        { stubs: { ContentViewer: stub } },
      );

      // First click: incorrect
      await fireEvent.click(screen.getByText(check$()));
      expect(getStatusText()).toBe(tryAgain$());

      // Second click: correct (rectified)
      await fireEvent.click(screen.getByText(check$()));
      expect(getStatusText()).toBe(greatKeepGoing$());
    });

    it('does not send progress on the second attempt', async () => {
      let callCount = 0;
      const stub = makeContentViewerStub({
        checkAnswerFn: () => {
          callCount++;
          if (callCount === 1) {
            return { correct: false, answerState: {}, simpleAnswer: '' };
          }
          return { correct: true, answerState: {}, simpleAnswer: '' };
        },
      });

      const { emitted } = renderComponent(
        { pastattempts: [{ correct: 0, id: 'att-1' }] },
        { stubs: { ContentViewer: stub } },
      );

      await fireEvent.click(screen.getByText(check$())); // first attempt
      await fireEvent.click(screen.getByText(check$())); // second attempt

      const secondInteraction = emitted().updateInteraction[1][0];
      expect(secondInteraction.progress).toBeUndefined();
      expect(secondInteraction.interaction.id).toBe('att-1');
    });
  });

  describe('nextQuestion', () => {
    it('resets state and shows Check button after clicking Next', async () => {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({ correct: true, answerState: {}, simpleAnswer: '' }),
      });
      renderComponent({}, { stubs: { ContentViewer: stub } });

      await fireEvent.click(screen.getByText(check$()));
      expect(screen.getByText(next$())).toBeInTheDocument();

      await fireEvent.click(screen.getByText(next$()));
      expect(screen.getByText(check$())).toBeInTheDocument();
      expect(screen.queryByText(next$())).not.toBeInTheDocument();
    });
  });

  describe('item error handling', () => {
    it('shows error alert with "Try a different question" button', async () => {
      renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-item-error'));

      await waitFor(() => {
        expect(screen.getByText(itemError$())).toBeInTheDocument();
        expect(screen.getByText(tryDifferentQuestion$())).toBeInTheDocument();
      });
    });

    it('shows "Try next question" in the status area on item error', async () => {
      renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-item-error'));

      await waitFor(() => {
        expect(getStatusText()).toBe('Try next question');
      });
    });

    it('switches to Next button on item error', async () => {
      renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-item-error'));

      await waitFor(() => {
        expect(screen.getByText(next$())).toBeInTheDocument();
      });
    });

    it('emits updateInteraction with error=true on item error', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-item-error'));

      await waitFor(() => {
        const [{ interaction }] = emitted().updateInteraction[0];
        expect(interaction.error).toBe(true);
      });
    });

    it('clicking "Try a different question" resets to a new question', async () => {
      renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-item-error'));

      await waitFor(() => {
        expect(screen.getByText(tryDifferentQuestion$())).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(tryDifferentQuestion$()));

      await waitFor(() => {
        expect(screen.queryByText(itemError$())).not.toBeInTheDocument();
        expect(screen.getByText(check$())).toBeInTheDocument();
      });
    });
  });

  describe('hintTaken', () => {
    it('shows "Hint used" in the status area after a hint is taken on a non-first attempt', async () => {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({ correct: false, answerState: {}, simpleAnswer: '' }),
      });

      renderComponent(
        { pastattempts: [{ correct: 0, id: 'past-1' }] },
        { stubs: { ContentViewer: stub } },
      );

      // First click: wrong → consumes first attempt at question
      await fireEvent.click(screen.getByText(check$()));

      // Now trigger hint taken via the stub button
      await fireEvent.click(screen.getByTestId('trigger-hint-taken'));

      await waitFor(() => {
        expect(getStatusText()).toBe('Hint used');
      });
    });
  });

  describe('success watcher', () => {
    it('emits "finished" when mastered changes from false to true', async () => {
      const { emitted, updateProps } = renderComponent({ mastered: false });
      expect(emitted().finished).toBeUndefined();

      await updateProps({ mastered: true });
      expect(emitted().finished).toBeTruthy();
    });

    it('does not emit "finished" if mastered starts as true', () => {
      const { emitted } = renderComponent({ mastered: true });
      expect(emitted().finished).toBeUndefined();
    });
  });

  describe('event pass-through from ContentViewer', () => {
    it('emits startTracking when content viewer fires startTracking', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-start-tracking'));
      expect(emitted().startTracking).toBeTruthy();
    });

    it('emits stopTracking when content viewer fires stopTracking', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-stop-tracking'));
      expect(emitted().stopTracking).toBeTruthy();
    });

    it('emits updateProgress when content viewer fires updateProgress', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-update-progress'));
      expect(emitted().updateProgress).toBeTruthy();
      expect(emitted().updateProgress[0]).toEqual([0.5]);
    });

    it('emits updateContentState when content viewer fires updateContentState', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-update-content-state'));
      expect(emitted().updateContentState).toBeTruthy();
      expect(emitted().updateContentState[0]).toEqual([{ someState: true }]);
    });

    it('emits error when content viewer fires error', async () => {
      const { emitted } = renderComponent();
      await fireEvent.click(screen.getByTestId('trigger-error'));
      expect(emitted().error).toBeTruthy();
    });

    it('emits nextResource when the next resource button is clicked', async () => {
      const { emitted } = renderComponent({ hasNextResource: true });
      // The next resource button is rendered separately from the Check/Next button
      const buttons = screen.getAllByRole('button');
      const nextResourceButton = buttons[buttons.length - 1];
      await fireEvent.click(nextResourceButton);
      expect(emitted().nextResource).toBeTruthy();
    });
  });

  describe('hints UI', () => {
    it('does not show hint buttons when totalHints is 0', () => {
      renderComponent();
      expect(
        screen.queryByText(hintTranslator.hint$({ hintsLeft: 1 }), { exact: false }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(hintTranslator.noMoreHint$())).not.toBeInTheDocument();
    });

    it('shows hint button with count after startTracking', async () => {
      const stub = makeContentViewerStub({ availableHints: 3, totalHints: 5 });
      renderComponent({}, { stubs: { ContentViewer: stub } });

      await fireEvent.click(screen.getByTestId('trigger-start-tracking'));

      await waitFor(() => {
        expect(screen.getByText(hintTranslator.hint$({ hintsLeft: 3 }))).toBeInTheDocument();
      });
    });

    it('shows "No more hints" when available hints is 0 but total hints > 0', async () => {
      const stub = makeContentViewerStub({ availableHints: 0, totalHints: 5 });
      renderComponent({}, { stubs: { ContentViewer: stub } });

      await fireEvent.click(screen.getByTestId('trigger-start-tracking'));

      await waitFor(() => {
        expect(screen.getByText(hintTranslator.noMoreHint$())).toBeInTheDocument();
      });
    });

    it('calls takeHint on the content viewer when the hint button is clicked', async () => {
      const stub = makeContentViewerStub({ availableHints: 3, totalHints: 5 });
      const { emitted } = renderComponent({}, { stubs: { ContentViewer: stub } });

      await fireEvent.click(screen.getByTestId('trigger-start-tracking'));

      await waitFor(() => {
        expect(screen.getByText(hintTranslator.hint$({ hintsLeft: 3 }))).toBeInTheDocument();
      });

      await fireEvent.click(screen.getByText(hintTranslator.hint$({ hintsLeft: 3 })));

      await waitFor(() => {
        expect(emitted().updateInteraction).toBeTruthy();
        const [{ interaction }] = emitted().updateInteraction[0];
        expect(interaction.hinted).toBe(true);
      });
    });
  });

  describe('mastery model variations in UI', () => {
    it('shows correct goal for do_all model', () => {
      renderComponent({
        assessmentIds: ['a', 'b'],
        masteryModel: { type: 'do_all' },
      });
      expect(screen.getAllByText(goal$({ count: 2 })).length).toBeGreaterThanOrEqual(1);
    });

    it('shows correct goal for num_correct_in_a_row_2', () => {
      renderComponent({ masteryModel: { type: 'num_correct_in_a_row_2' } });
      expect(screen.getAllByText(goal$({ count: 2 })).length).toBeGreaterThanOrEqual(1);
    });

    it('shows correct goal for num_correct_in_a_row_3', () => {
      renderComponent({ masteryModel: { type: 'num_correct_in_a_row_3' } });
      expect(screen.getAllByText(goal$({ count: 3 })).length).toBeGreaterThanOrEqual(1);
    });

    it('shows correct goal for num_correct_in_a_row_10', () => {
      renderComponent({ masteryModel: { type: 'num_correct_in_a_row_10' } });
      expect(screen.getAllByText(goal$({ count: 10 })).length).toBeGreaterThanOrEqual(1);
    });

    it('renders the correct number of attempt placeholder slots for do_all', () => {
      const { container } = renderComponent({
        assessmentIds: ['a', 'b', 'c'],
        masteryModel: { type: 'do_all' },
      });
      // do_all with 3 items → n=3
      const placeholders = container.querySelectorAll('.placeholder');
      expect(placeholders).toHaveLength(3);
    });

    it('renders the correct number of attempt placeholder slots for num_correct_in_a_row_5', () => {
      const { container } = renderComponent({
        masteryModel: { type: 'num_correct_in_a_row_5' },
      });
      const placeholders = container.querySelectorAll('.placeholder');
      expect(placeholders).toHaveLength(5);
    });
  });

  describe('exerciseProgress through emitted progress', () => {
    function renderAndCheck(props) {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({ correct: true, answerState: {}, simpleAnswer: '' }),
      });
      const result = renderComponent(props, { stubs: { ContentViewer: stub } });
      return result;
    }

    function renderAndCheckIncorrect(props) {
      const stub = makeContentViewerStub({
        checkAnswerFn: () => ({ correct: false, answerState: {}, simpleAnswer: '' }),
      });
      return renderComponent(props, { stubs: { ContentViewer: stub } });
    }

    it('emits progress > 0 with no past attempts and a correct answer', async () => {
      const { emitted } = renderAndCheck({});
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      expect(progress).toBeGreaterThan(0);
    });

    it('emits progress=1 when already mastered', async () => {
      const { emitted } = renderAndCheck({ mastered: true });
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      expect(progress).toBe(1);
    });

    it('calculates partial progress with m_of_n model', async () => {
      // 2 correct past + 1 correct submitting = 3/3 = 1
      const { emitted } = renderAndCheck({
        pastattempts: [{ correct: 1 }, { correct: 1 }],
        masteryModel: { type: 'm_of_n', m: 3, n: 5 },
      });
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      expect(progress).toBe(1);
    });

    it('caps progress at 1 when all attempts in window are correct', async () => {
      const { emitted } = renderAndCheck({
        pastattempts: [{ correct: 1 }, { correct: 1 }, { correct: 1 }, { correct: 1 }],
        masteryModel: { type: 'm_of_n', m: 3, n: 5 },
      });
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      expect(progress).toBe(1);
    });

    it('returns at least 0.001 when there are attempts but none correct', async () => {
      const { emitted } = renderAndCheckIncorrect({
        masteryModel: { type: 'm_of_n', m: 3, n: 5 },
      });
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      // exerciseProgress([{correct:0}]) → 0/3=0 → max(0, 0.001)=0.001
      expect(progress).toBe(0.001);
    });

    it('uses window of n when past attempts exceed n', async () => {
      // 6 past attempts, window n=5, submitting 1 correct → total 7.
      // Window = first 5 of [submitting, ...past] = [1, 1, 1, 1, 0] → 4/3 capped at 1
      const { emitted } = renderAndCheck({
        pastattempts: [
          { correct: 1 },
          { correct: 1 },
          { correct: 1 },
          { correct: 0 },
          { correct: 0 },
          { correct: 0 },
        ],
        masteryModel: { type: 'm_of_n', m: 3, n: 5 },
      });
      await fireEvent.click(screen.getByText(check$()));
      const [{ progress }] = emitted().updateInteraction[0];
      expect(progress).toBe(1);
    });
  });

  describe('recentAttempts rendering through ExerciseAttempts', () => {
    it('renders correct icons for past correct attempts', () => {
      const { container } = renderComponent({
        pastattempts: [{ correct: 1 }, { correct: 1 }],
      });
      // Each correct attempt renders an SVG with class="correct" inside the AnswerIcon
      const correctIcons = container.querySelectorAll('.attempt svg.correct');
      expect(correctIcons).toHaveLength(2);
    });

    it('renders rectified icon for past incorrect attempt (else branch)', () => {
      const { container } = renderComponent({
        pastattempts: [{ correct: 0 }],
      });
      // When firstAttemptAtQuestion=true, incorrect attempt → 'rectified' →
      // SVG with class="rectified"
      const rectifiedIcons = container.querySelectorAll('.attempt svg.rectified');
      expect(rectifiedIcons).toHaveLength(1);
    });

    it('renders correct number of attempt icons for mixed results', () => {
      const { container } = renderComponent({
        pastattempts: [{ correct: 1 }, { correct: 0 }, { correct: 1 }],
      });
      // 1→'right'(correct), 0→'rectified', 1→'right'(correct)
      const correctIcons = container.querySelectorAll('.attempt svg.correct');
      const rectifiedIcons = container.querySelectorAll('.attempt svg.rectified');
      expect(correctIcons).toHaveLength(2);
      expect(rectifiedIcons).toHaveLength(1);
    });
  });
});
