import selectQuestions from '../src/utils/selectQuestions';

jest.mock('kolibri.lib.logging');

const EXERCISES_IDS = ['A', 'B', 'C'];
const EXERCISES_TITLES = ['title_x', 'title_y', 'title_z'];
const UNIQUE_QUESTION_IDS = [
  ['A:A1', 'A:A2', 'A:A3'],
  ['B:B1', 'B:B2', 'B:B3', 'B:B4', 'B:B5', 'B:B6', 'B:B7', 'B:B8'],
  ['C:C1', 'C:C2', 'C:C3', 'C:C4', 'C:C5', 'C:C6', 'C:C7', 'C:C8', 'C:C9'],
];

function countQuestions(exerciseId, questionList) {
  return questionList.reduce(
    (acc, question) => (question.exercise_id === exerciseId ? acc + 1 : acc),
    0
  );
}

expect.extend({
  toBeOneOf(received, a, b) {
    const possibilities = [a, b];
    return {
      message: () => `expected ${received} to be one of ${JSON.stringify(possibilities)}`,
      pass: possibilities.includes(received),
    };
  },
});

describe('selectQuestions function', () => {
  it('will choose even distributions across multiple exercises', () => {
    const numQs = 8;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(2, 3);
    expect(countQuestions('B', output)).toBeOneOf(2, 3);
    expect(countQuestions('C', output)).toBeOneOf(2, 3);
  });

  it('will choose questions from a single exercise', () => {
    const numQs = 8;
    const output = selectQuestions(
      numQs,
      EXERCISES_IDS.slice(2),
      EXERCISES_TITLES.slice(2),
      UNIQUE_QUESTION_IDS.slice(2),
      1
    );
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(0);
    expect(countQuestions('B', output)).toBe(0);
    expect(countQuestions('C', output)).toBe(8);
  });

  it('handles a small number of questions from a few exercises', () => {
    const numQs = 2;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(0, 1);
    expect(countQuestions('B', output)).toBeOneOf(0, 1);
    expect(countQuestions('C', output)).toBeOneOf(0, 1);
  });

  it('will handle exercises with smaller numbers of questions', () => {
    const numQs = 18;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(3);
    expect(countQuestions('B', output)).toBeOneOf(7, 8);
    expect(countQuestions('C', output)).toBeOneOf(7, 8);
  });

  it('will choose the same questions for the same seed', () => {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    const output2 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    expect(output1).toEqual(output2);
  });

  it('will choose different questions for different seeds', () => {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 1);
    const output2 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, UNIQUE_QUESTION_IDS, 2);
    expect(output1).not.toEqual(output2);
  });
});
