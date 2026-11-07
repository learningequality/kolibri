import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import QuizDifficulties from '../../../apiResources/quizDifficulties';
import { setItemStats } from '../actions';

jest.mock('kolibri-common/apiResources/ExamResource');
jest.mock('kolibri-common/quizzes/utils');
jest.mock('../../../apiResources/quizDifficulties');

describe('questionList/actions setItemStats for a quiz', () => {
  it('titles questions with their exercise name when they have no title', async () => {
    ExamResource.retrieve.mockResolvedValue({ id: 'quiz' });
    fetchExamWithContent.mockResolvedValue({
      exam: {
        id: 'quiz',
        question_sources: [
          {
            questions: [
              { item: 'q1:ex1', exercise_id: 'ex1', counter_in_exercise: 5, title: '' },
              { item: 'q2:ex1', exercise_id: 'ex1', counter_in_exercise: 6, title: 'Warm-up' },
            ],
          },
        ],
      },
      exercises: [{ id: 'ex1', title: 'Adding fractions' }],
    });
    QuizDifficulties.fetchDifficultQuestions.mockResolvedValue([]);
    const store = { commit: jest.fn() };

    const stats = await setItemStats(store, { classId: 'class', quizId: 'quiz' });

    expect(stats.map(stat => stat.title)).toEqual(['Adding fractions (5)', 'Warm-up']);
  });
});
