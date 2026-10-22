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

const renderComponent = () => {
  const pendingTries = {};
  MasteryLogResource.list.mockResolvedValue(PAST_TRIES);
  MasteryLogResource.fetchMostRecentDiff.mockImplementation(
    ({ back }) =>
      new Promise((resolve, reject) => {
        pendingTries[back] = {
          resolve: () => resolve({ ...PAST_TRIES[back], attemptlogs: ATTEMPTLOGS }),
          reject: () => reject(new Error()),
        };
      }),
  );
  const navigateTo = jest.fn(tryIndex => updateProps({ tryIndex }));
  const { updateProps } = render(QuizReport, {
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
    resolveTry: back => pendingTries[back].resolve(),
    rejectTry: back => pendingTries[back].reject(),
  };
};

// KSelect gives its control no role or accessible name
const getAttemptSelect = async () =>
  (await screen.findByText(attemptDropdownLabel$(), { selector: '.ui-select-label-text' })).closest(
    '.ui-select-label',
  );

const renderLoaded = async () => {
  const { resolveTry, rejectTry } = renderComponent();
  resolveTry(0);
  expect(await screen.findByTestId('try-score')).toHaveTextContent('100%');
  return { resolveTry, rejectTry, select: await getAttemptSelect() };
};

const chooseTryWithMouse = async (select, score) => {
  await userEvent.click(within(select).getByText(attemptDropdownLabel$()));
  await userEvent.click(screen.getByText(tryLabel(score), { selector: '.ui-select-option-basic' }));
};

describe('QuizReport', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps focus on the Attempt select after choosing another attempt with the keyboard', async () => {
    const { resolveTry, select } = await renderLoaded();

    select.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    resolveTry(1);

    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
    expect(select).toHaveTextContent(tryLabel('50%'));
    expect(select).toHaveFocus();
  });

  it('keeps focus on the Attempt select after choosing another attempt with the mouse', async () => {
    const { resolveTry, select } = await renderLoaded();

    await chooseTryWithMouse(select, '50%');
    resolveTry(1);

    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
    expect(select).toHaveTextContent(tryLabel('50%'));
    expect(select).toHaveFocus();
  });

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
    await new Promise(resolve => setTimeout(resolve));

    expect(select).toHaveTextContent(tryLabel('50%'));
    expect(screen.getByTestId('try-score')).toHaveTextContent('50%');
  });

  it('keeps the last chosen attempt loading when an earlier choice fails', async () => {
    const { resolveTry, rejectTry, select } = await renderLoaded();

    await chooseTryWithMouse(select, '0%');
    await chooseTryWithMouse(select, '50%');
    rejectTry(2);
    await new Promise(resolve => setTimeout(resolve));

    expect(screen.queryByTestId('try-score')).not.toBeInTheDocument();
    resolveTry(1);
    expect(await screen.findByTestId('try-score')).toHaveTextContent('50%');
  });
});
