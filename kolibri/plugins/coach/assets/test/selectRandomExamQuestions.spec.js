import selectQuestions from '../src/modules/examCreation/selectQuestions';

const EXERCISES_IDS = ['A', 'B', 'C'];
const EXERCISES_TITLES = ['title_x', 'title_y', 'title_z'];
const QUESTION_IDS = [
  ['A1', 'A2', 'A3'],
  ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
  ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'],
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
    const pass = possibilities.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} to be one of ${JSON.stringify(possibilities)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${JSON.stringify(possibilities)}`,
        pass: false,
      };
    }
  },
});

describe('selectQuestions function', () => {
  it('will choose even distributions across multiple exercises', function() {
    const numQs = 8;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(2, 3);
    expect(countQuestions('B', output)).toBeOneOf(2, 3);
    expect(countQuestions('C', output)).toBeOneOf(2, 3);
  });
  it('will choose questions from a single exercise', function() {
    const numQs = 8;
    const output = selectQuestions(
      numQs,
      EXERCISES_IDS.slice(2),
      EXERCISES_TITLES.slice(2),
      QUESTION_IDS.slice(2),
      1
    );
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(0);
    expect(countQuestions('B', output)).toBe(0);
    expect(countQuestions('C', output)).toBe(8);
  });
  it('handles a small number of questions from a few exercises', function() {
    const numQs = 2;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(0, 1);
    expect(countQuestions('B', output)).toBeOneOf(0, 1);
    expect(countQuestions('C', output)).toBeOneOf(0, 1);
  });
  it('will handle exercises with smaller numbers of questions', function() {
    const numQs = 18;
    const output = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(3);
    expect(countQuestions('B', output)).toBeOneOf(7, 8);
    expect(countQuestions('C', output)).toBeOneOf(7, 8);
  });
  it('will choose the same questions for the same seed', function() {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    const output2 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    expect(output1).toEqual(output2);
  });
  it('will choose different questions for different seeds', function() {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 1);
    const output2 = selectQuestions(numQs, EXERCISES_IDS, EXERCISES_TITLES, QUESTION_IDS, 2);
    expect(output1).not.toEqual(output2);
  });
});
