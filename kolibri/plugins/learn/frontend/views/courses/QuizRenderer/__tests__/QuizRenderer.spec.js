import { render, screen } from '@testing-library/vue';
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

async function renderQuiz(props) {
  render(QuizRenderer, {
    props: { content, userId: 'learner-id', userFullName: LEARNER_NAME, ...props },
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
});
