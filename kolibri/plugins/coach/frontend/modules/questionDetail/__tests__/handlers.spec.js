import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import store from '../../../store';
import { questionRootRedirectHandler } from '../handlers';

jest.mock('kolibri-common/apiResources/ContentNodeResource');
jest.mock('kolibri-common/quizzes/utils');
jest.mock('../../../store', () => ({
  state: { classSummary: { examMap: { quiz: { id: 'quiz' } } } },
  commit: jest.fn(),
  dispatch: jest.fn(),
}));

function questionDetailTitle(question) {
  fetchExamWithContent.mockResolvedValue({
    exam: { id: 'quiz', question_sources: [{ questions: [question] }] },
  });
  return questionRootRedirectHandler(
    { quizId: 'quiz', questionId: question.item },
    'QUESTION',
    jest.fn(),
  ).then(() => {
    const [, state] = store.commit.mock.calls.find(([type]) => type === 'questionDetail/SET_STATE');
    return state.title;
  });
}

describe('questionDetail/handlers for a quiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentNodeResource.retrieve.mockResolvedValue({ id: 'ex1', title: 'Adding fractions' });
    store.dispatch.mockResolvedValue([{ id: 'learner' }]);
  });

  it('titles the question with its exercise name when it has no title', async () => {
    const title = await questionDetailTitle({
      item: 'q1:ex1',
      exercise_id: 'ex1',
      counter_in_exercise: 5,
      title: '',
    });
    expect(title).toBe('Adding fractions (5)');
  });

  it('keeps the title the coach set for the question', async () => {
    const title = await questionDetailTitle({
      item: 'q1:ex1',
      exercise_id: 'ex1',
      counter_in_exercise: 5,
      title: 'Warm-up',
    });
    expect(title).toBe('Warm-up');
  });
});
