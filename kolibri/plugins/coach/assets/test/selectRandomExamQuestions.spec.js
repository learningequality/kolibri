import selectQuestions, { exerciseToQuestionArray } from '../src/utils/selectQuestions';

const EXERCISES = [
  {
    id: 'A',
    title: 'title_x',
    assessmentmetadata: { assessment_item_ids: ['A1', 'A2', 'A3'] },
  },
  {
    id: 'B',
    title: 'title_y',
    assessmentmetadata: { assessment_item_ids: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] },
  },
  {
    id: 'C',
    title: 'title_z',
    assessmentmetadata: {
      assessment_item_ids: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9'],
    },
  },
];

function countQuestions(exerciseId, questionList) {
  return questionList.reduce(
    (acc, question) => (question.exercise_id === exerciseId ? acc + 1 : acc),
    0,
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

describe('exerciseToQuestionArray function', () => {
  it('will convert an exercise to an array of questions', () => {
    const exercise = EXERCISES[0];
    const output = exerciseToQuestionArray(exercise);
    expect(output.length).toEqual(3);
    expect(output[0].exercise_id).toEqual('A');
    expect(output[0].question_id).toEqual('A1');
    expect(output[0].counter_in_exercise).toEqual(1);
    expect(output[0].title).toEqual('');
    expect(output[0].item).toEqual('A:A1');
  });
});

describe('selectQuestions function', () => {
  it('will choose even distributions across multiple exercises', () => {
    const numQs = 8;
    const output = selectQuestions(numQs, EXERCISES, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(2, 3);
    expect(countQuestions('B', output)).toBeOneOf(2, 3);
    expect(countQuestions('C', output)).toBeOneOf(2, 3);
  });

  it('will choose questions from a single exercise', () => {
    const numQs = 8;
    const output = selectQuestions(numQs, EXERCISES.slice(2), 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(0);
    expect(countQuestions('B', output)).toBe(0);
    expect(countQuestions('C', output)).toBe(8);
  });

  it('handles a small number of questions from a few exercises', () => {
    const numQs = 2;
    const output = selectQuestions(numQs, EXERCISES, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBeOneOf(0, 1);
    expect(countQuestions('B', output)).toBeOneOf(0, 1);
    expect(countQuestions('C', output)).toBeOneOf(0, 1);
  });

  it('will handle exercises with smaller numbers of questions', () => {
    const numQs = 18;
    const output = selectQuestions(numQs, EXERCISES, 1);
    expect(output.length).toEqual(numQs);
    expect(countQuestions('A', output)).toBe(3);
    expect(countQuestions('B', output)).toBeOneOf(7, 8);
    expect(countQuestions('C', output)).toBeOneOf(7, 8);
  });

  it('will choose the same questions for the same seed', () => {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES, 1);
    const output2 = selectQuestions(numQs, EXERCISES, 1);
    expect(output1).toEqual(output2);
  });

  it('will choose different questions for different seeds', () => {
    const numQs = 5;
    const output1 = selectQuestions(numQs, EXERCISES, 1);
    const output2 = selectQuestions(numQs, EXERCISES, 2);
    expect(output1).not.toEqual(output2);
  });
});
