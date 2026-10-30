import { quizQuestionTitle } from '..';

const EXERCISES = [{ id: 'ex1', title: 'Adding fractions' }];

describe('quizQuestionTitle', () => {
  it('uses the exercise title and the question number when the question has no title', () => {
    const question = { exercise_id: 'ex1', counter_in_exercise: 5, title: '' };
    expect(quizQuestionTitle(question, EXERCISES)).toBe('Adding fractions (5)');
  });

  it('uses the title the coach set', () => {
    const question = { exercise_id: 'ex1', counter_in_exercise: 5, title: 'Warm-up' };
    expect(quizQuestionTitle(question, EXERCISES)).toBe('Warm-up');
  });

  it('shows only the number when the exercise is not available', () => {
    const question = { exercise_id: 'missing', counter_in_exercise: 5, title: '' };
    const title = quizQuestionTitle(question, EXERCISES);
    expect(title).toContain('(5)');
    expect(title).not.toContain('undefined');
  });
});
