import ExamResource from 'kolibri-common/apiResources/ExamResource';
import { fetchExamWithContent } from 'kolibri-common/quizzes/utils';
import QuizDifficulties from '../../../../apiResources/quizDifficulties';
import { fetchQuizSummaryPageData } from '../api';

jest.mock('kolibri-common/apiResources/ExamResource');
jest.mock('kolibri-common/quizzes/utils');
jest.mock('../../../../apiResources/quizDifficulties');

const QUESTIONS = [
  { item: 'q1:ex1', exercise_id: 'ex1', counter_in_exercise: 5, title: '' },
  { item: 'q2:ex1', exercise_id: 'ex1', counter_in_exercise: 12, title: 'Fractions warm-up' },
  { item: 'q3:ex2', exercise_id: 'ex2', counter_in_exercise: 12, title: '' },
];

describe('fetchQuizSummaryPageData', () => {
  beforeEach(() => {
    ExamResource.retrieve.mockResolvedValue({ id: 'quiz' });
    fetchExamWithContent.mockResolvedValue({
      exam: { id: 'quiz', question_sources: [{ questions: QUESTIONS.map(q => ({ ...q })) }] },
      exercises: [
        { id: 'ex1', title: 'Adding fractions' },
        { id: 'ex2', title: 'Subtracting fractions' },
      ],
    });
    QuizDifficulties.fetchDifficultQuestions.mockResolvedValue(
      QUESTIONS.map(({ item }) => ({ item, correct: 0, total: 1 })),
    );
  });

  it('titles difficult questions with their exercise name when they have no title', async () => {
    const { difficultQuestions } = await fetchQuizSummaryPageData('quiz');
    const titles = Object.fromEntries(difficultQuestions.map(q => [q.item, q.title]));
    expect(titles).toEqual({
      'q1:ex1': 'Adding fractions (5)',
      'q2:ex1': 'Fractions warm-up',
      'q3:ex2': 'Subtracting fractions (12)',
    });
  });
});
