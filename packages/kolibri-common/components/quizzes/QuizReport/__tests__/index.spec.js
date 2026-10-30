/* global flushPromises */
import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTranslator } from 'kolibri/utils/i18n';
import MasteryLogResource from 'kolibri-common/apiResources/MasteryLogResource';
import QuizReport from '..';

jest.mock('kolibri-common/apiResources/MasteryLogResource');

const { attemptDropdownLabel$ } = createTranslator(QuizReport.name, QuizReport.$trs);

const QUESTIONS = ['first', 'second'].map((item, index) => ({
  exercise_id: 'exercise',
  question_id: item,
  counter_in_exercise: index,
  title: item,
  item,
}));
const PAST_TRIES = [
  { id: 'recent', correct: 2, completion_timestamp: new Date() },
  { id: 'earlier', correct: 1, completion_timestamp: new Date() },
  { id: 'earliest', correct: 0, completion_timestamp: new Date() },
];
const ATTEMPTLOGS = [{ item: 'first', correct: 1, end_timestamp: new Date() }];
const tryLabel = score => new RegExp(`\\(${score}\\)`);

const renderComponent = ({ pastTries = PAST_TRIES } = {}) => {
  const pendingTries = {};
  MasteryLogResource.list.mockResolvedValue(pastTries);
  MasteryLogResource.fetchMostRecentDiff.mockImplementation(
    ({ back }) =>
      new Promise((resolve, reject) => {
        pendingTries[back] = { resolve, reject };
      }),
  );
  const navigateTo = jest.fn(tryIndex => updateProps({ tryIndex }));
  const { updateProps, emitted } = render(QuizReport, {
    props: {
      contentId: 'content',
      title: 'Exercise',
      userId: 'learner',
      userName: 'Learner',
      selectedInteractionIndex: 0,
      questionNumber: 0,
      tryIndex: 0,
      isQuiz: false,
      exercise: { kind: 'exercise' },
      questions: QUESTIONS,
      navigateTo,
    },
  });
  return {
    resolveTry: (back, tries = pastTries) =>
      pendingTries[back].resolve({ ...tries[back], attemptlogs: ATTEMPTLOGS }),
    rejectTry: (back, error = new Error()) => pendingTries[back].reject(error),
    updateProps,
    emitted,
  };
};

// KSelect gives its control no role or accessible name
const getAttemptSelect = async () =>
  (await screen.findByText(attemptDropdownLabel$(), { selector: '.ui-select-label-text' })).closest(
    '.ui-select-label',
  );

const renderLoaded = async () => {
  const rendered = renderComponent();
  rendered.resolveTry(0);
  expect(await screen.findByTestId('try-score')).toHaveTextContent('100%');
  return { ...rendered, select: await getAttemptSelect() };
};

const chooseTryWithMouse = async (select, score) => {
  await userEvent.click(within(select).getByText(attemptDropdownLabel$()));
  await userEvent.click(screen.getByText(tryLabel(score), { selector: '.ui-select-option-basic' }));
};

describe('QuizReport', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'keyboard',
      async select => {
        select.focus();
        await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');
      },
    ],
    ['mouse', select => chooseTryWithMouse(select, '50%')],
  ])(
    'keeps focus on the Attempt select after choosing another attempt with the %s',
    async (_, chooseTry) => {
      const { resolveTry, select } = await renderLoaded();

      await chooseTry(select);
      resolveTry(1);

      expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
      expect(select).toHaveTextContent(tryLabel('50%'));
      expect(select).toHaveFocus();
    },
  );

  it('hides the chosen attempt overview until that attempt loads', async () => {
    const { resolveTry, select } = await renderLoaded();

    await chooseTryWithMouse(select, '50%');

    expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
    resolveTry(1);
    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
  });

  it('shows the last chosen attempt when an earlier choice loads after it', async () => {
    const { resolveTry, select } = await renderLoaded();

    await chooseTryWithMouse(select, '0%');
    await chooseTryWithMouse(select, '50%');
    resolveTry(1);
    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
    resolveTry(2);
    await flushPromises();

    expect(select).toHaveTextContent(tryLabel('50%'));
    expect(screen.getByTestId('try-score')).toHaveTextContent('50%');
  });

  it('keeps the last chosen attempt loading when an earlier choice fails', async () => {
    const { resolveTry, rejectTry, select } = await renderLoaded();

    await chooseTryWithMouse(select, '0%');
    await chooseTryWithMouse(select, '50%');
    rejectTry(2);
    await flushPromises();

    expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    resolveTry(1);
    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
  });

  it('labels the chosen attempt by the tries listed when it loads', async () => {
    const { resolveTry, select } = await renderLoaded();
    const triesWithNewTry = [
      { id: 'new', correct: 0, completion_timestamp: new Date() },
      ...PAST_TRIES,
    ];
    MasteryLogResource.list.mockResolvedValue(triesWithNewTry);

    await chooseTryWithMouse(select, '50%');
    resolveTry(1, triesWithNewTry);

    expect(await screen.findByTestId('try-score')).toHaveTextContent('100%');
    expect(select).toHaveTextContent(tryLabel('100%'));
  });

  it('shows no Attempt select for a learner with one try', async () => {
    const { resolveTry } = renderComponent({ pastTries: PAST_TRIES.slice(0, 1) });
    resolveTry(0);

    expect(await screen.findByTestId('try-score')).toHaveTextContent('100%');
    expect(
      screen.queryByText(attemptDropdownLabel$(), { selector: '.ui-select-label-text' }),
    ).not.toBeInTheDocument();
  });

  it('emits noCompleteTries when the learner has no completed try', async () => {
    const { rejectTry, emitted } = renderComponent({ pastTries: [] });
    rejectTry(0, { response: { status_code: 404 } });
    await flushPromises();

    expect(emitted().noCompleteTries).toHaveLength(1);
  });

  it('clears the previous attempt when switching to a try that does not exist', async () => {
    const { rejectTry, updateProps } = await renderLoaded();

    await updateProps({ tryIndex: 9 });
    rejectTry(9, { response: { status_code: 404 } });
    await flushPromises();

    expect(
      (await getAttemptSelect()).querySelector('.ui-select-display-value'),
    ).not.toHaveTextContent(tryLabel('\\d+%'));
    expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
  });
});
