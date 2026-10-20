import { fireEvent, render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import QuizRenderer from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const LEARNER_NAME = 'Learner name';

const content = {
  id: 'quiz-id',
  content_id: 'quiz-content-id',
  title: 'Quiz',
  kind: 'exercise',
  options: {},
  assessmentmetadata: { assessment_item_ids: ['item-1', 'item-2'] },
};

const ANSWER = 'Answer';
const NEXT = QuizRenderer.$trs.nextQuestion.message;

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

async function renderQuiz(props) {
  render(QuizRenderer, {
    props: { content, userId: 'learner-id', userFullName: LEARNER_NAME, ...props },
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
