import { generateNumberLineOptions } from '@khanacademy/perseus-core';
import { scoreItem } from '../scoring';
import makeItem from '../testUtils/makeItem';
import widgetSolver from '../widgetSolver';

function inputNumberWidgets(options) {
  return {
    'input-number 1': {
      type: 'input-number',
      graded: true,
      options: {
        size: 'normal',
        inexact: false,
        maxError: 0.1,
        answerType: 'number',
        rightAlign: false,
        ...options,
      },
    },
  };
}

function solve(widgets, id) {
  const { type, options } = widgets[id];
  return widgetSolver(type, options);
}

function scoresCorrect(item, userInput) {
  const score = scoreItem(item.question, userInput, 'en');
  return score.type === 'points' && score.earned === score.total;
}

describe('widgetSolver', () => {
  it.each([
    [42, '42'],
    [0.5, '1/2'],
    ['0.5', '1/2'],
    [1.5, '3/2'],
    [-1.5, '-3/2'],
    [0.123, '0.123'],
    [1e-7, '0.0000001'],
    [1.5e-7, '0.00000015'],
    [7 / 120, '7/120'],
    [1 / 101, '1/101'],
    [50 / 147, '50/147'],
    [4096 + 1 / 101, '413697/101'],
  ])('answers an input-number %p, which must be simplified, as %p', (value, currentValue) => {
    const item = makeItem(inputNumberWidgets({ value, simplify: 'required' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(userInput).toEqual({ currentValue });
    expect(scoresCorrect(item, { 'input-number 1': userInput })).toBe(true);
  });

  it('answers an input-number that need not be simplified with its decimal value', () => {
    const item = makeItem(inputNumberWidgets({ value: 0.5, simplify: 'optional' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(userInput).toEqual({ currentValue: '0.5' });
    expect(scoresCorrect(item, { 'input-number 1': userInput })).toBe(true);
  });

  it.each([
    ['decimal', 0.4],
    ['improper', 1.5],
    ['mixed', 1.5],
    ['rational', 0.75],
    ['integer', 7],
    ['pi', Math.PI],
    ['pi', 1.5 * Math.PI],
    ['pi', 3.14159],
    ['pi', 6.28318530718],
    ['pi', 11 * Math.PI],
  ])('answers an input-number of answer type %p with value %p', (answerType, value) => {
    const item = makeItem(inputNumberWidgets({ value, answerType, simplify: 'required' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(scoresCorrect(item, { 'input-number 1': userInput })).toBe(true);
  });

  function numericInputWidgets(answer) {
    return {
      'numeric-input 1': {
        type: 'numeric-input',
        graded: true,
        options: {
          answers: [
            {
              status: 'correct',
              message: '',
              simplify: 'required',
              maxError: null,
              answerForms: [],
              ...answer,
            },
          ],
          size: 'normal',
          coefficient: false,
          labelText: '',
          rightAlign: false,
          static: false,
        },
      },
    };
  }

  it.each([
    [{ value: 0.5, strict: false }],
    [{ value: 0.5, strict: false, simplify: 'optional' }],
    [{ value: 0.5, strict: true, answerForms: ['proper'] }],
    [{ value: 1.5, strict: true, answerForms: ['improper'] }],
    [{ value: 1.5, strict: true, answerForms: ['mixed'] }],
    [{ value: 0.75, strict: true, answerForms: ['mixed'] }],
    [{ value: -0.5, strict: true, answerForms: ['mixed'] }],
    [{ value: 0.75, strict: true, answerForms: ['mixed', 'improper'] }],
    [{ value: 0.505, strict: true, answerForms: ['proper'] }],
    [{ value: 0.25, strict: true, answerForms: ['decimal'] }],
    [{ value: 2 * Math.PI, strict: true, answerForms: ['pi'] }],
    [{ value: 11 * Math.PI, strict: true, answerForms: ['pi'] }],
    [{ value: 3.14159265359, strict: true, answerForms: ['pi'] }],
    [{ value: 6.28318530718, strict: true, answerForms: ['pi'] }],
    [{ value: 3.14, maxError: 0.01, strict: true, answerForms: ['pi'] }],
    [{ value: 0.123, strict: false }],
    [{ value: 2.718, strict: false }],
    [{ value: 2, strict: true, answerForms: ['integer', 'pi'] }],
    [{ value: 0.5, strict: true, answerForms: ['decimal', 'pi'] }],
    [{ value: 1e-7, strict: false }],
    [{ value: 6.02e23, strict: false }],
    [{ value: 1e21, strict: true, answerForms: ['integer'] }],
    [{ value: 1.5, strict: true, answerForms: ['integer', 'proper'] }],
    [{ value: 0.5, strict: true, answerForms: ['integer', 'improper'] }],
    [{ value: 4096.123, strict: true, answerForms: ['integer'], maxError: 0 }],
    [{ value: 4096.123, strict: true, answerForms: ['improper'], maxError: 0 }],
  ])('answers a numeric-input with answer %p', answer => {
    const item = makeItem(numericInputWidgets(answer));
    const userInput = solve(item.question.widgets, 'numeric-input 1');
    expect(scoresCorrect(item, { 'numeric-input 1': userInput })).toBe(true);
  });

  it.each([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12])(
    'answers a numeric-input in π form with %pπ to 15 digits',
    multiple => {
      const value = Number((multiple * Math.PI).toPrecision(15));
      const item = makeItem(numericInputWidgets({ value, strict: true, answerForms: ['pi'] }));
      const userInput = solve(item.question.widgets, 'numeric-input 1');
      expect(scoresCorrect(item, { 'numeric-input 1': userInput })).toBe(true);
    },
  );

  it.each([
    [Math.PI / 2, 'π/2'],
    [-Math.PI / 2, '-π/2'],
    [(2 * Math.PI) / 3, '2π/3'],
    [Math.PI, 'π'],
    [-Math.PI, '-π'],
    [3 * Math.PI, '3π'],
    [0, '0'],
  ])('answers a π-form numeric-input %p as %p', (value, currentValue) => {
    const item = makeItem(numericInputWidgets({ value, strict: true, answerForms: ['pi'] }));
    const userInput = solve(item.question.widgets, 'numeric-input 1');
    expect(userInput).toEqual({ currentValue });
    expect(scoresCorrect(item, { 'numeric-input 1': userInput })).toBe(true);
  });

  it('answers a π-form numeric-input that no π fraction matches with its decimal value', () => {
    const item = makeItem(
      numericInputWidgets({ value: 3.14, maxError: 0.01, strict: true, answerForms: ['pi'] }),
    );
    expect(solve(item.question.widgets, 'numeric-input 1')).toEqual({ currentValue: '3.14' });
  });

  it('answers a numeric-input with the first correct answer that has a value', () => {
    const item = makeItem(numericInputWidgets({ value: 5, strict: false }));
    const { answers } = item.question.widgets['numeric-input 1'].options;
    answers.unshift({ ...answers[0], value: null });
    const userInput = solve(item.question.widgets, 'numeric-input 1');
    expect(userInput).toEqual({ currentValue: '5' });
    expect(scoresCorrect(item, { 'numeric-input 1': userInput })).toBe(true);
  });

  it('answers a numeric-input that accepts decimals with its decimal value', () => {
    const item = makeItem(numericInputWidgets({ value: 12.07, strict: false }));
    expect(solve(item.question.widgets, 'numeric-input 1')).toEqual({ currentValue: '12.07' });
  });

  it.each([
    [{ range: [-5, 5], correctX: 0 }],
    [{ range: [0, 10], correctX: 3, isInequality: true, correctRel: 'lt' }],
    [{ range: [0, 10], correctX: 3, isInequality: true, correctRel: 'ge' }],
    [{ range: [0, 10], correctX: 3, isInequality: false, correctRel: 'ge' }],
    [{ range: [0, 1], numDivisions: 5, divisionRange: [2, 10], isTickCtrl: true, correctX: 0 }],
    [{ range: [0, 1], numDivisions: 5, divisionRange: [2, 10], isTickCtrl: true, correctX: 1 }],
    [{ range: [0, 10], numDivisions: 5, divisionRange: [3, 10], isTickCtrl: true, correctX: 5 }],
    [
      {
        range: [0, 4],
        numDivisions: null,
        tickStep: 0.5,
        divisionRange: [1, 8],
        isTickCtrl: true,
        correctX: 2,
      },
    ],
    [
      {
        range: [0, 4],
        numDivisions: null,
        tickStep: 0.25,
        divisionRange: [1, 8],
        isTickCtrl: true,
        correctX: 2,
      },
    ],
    [
      {
        range: [0.1, 0.5],
        numDivisions: 3,
        divisionRange: [1, 12],
        isTickCtrl: true,
        correctX: 0.3,
      },
    ],
  ])('answers a number line with options %p', options => {
    const item = makeItem({
      'number-line 1': {
        type: 'number-line',
        graded: true,
        options: generateNumberLineOptions({ numDivisions: 10, tickStep: null, ...options }),
      },
    });
    const userInput = solve(item.question.widgets, 'number-line 1');
    expect(scoresCorrect(item, { 'number-line 1': userInput })).toBe(true);
  });

  it('answers a number line with its correct position', () => {
    const item = makeItem({
      'number-line 1': {
        type: 'number-line',
        graded: true,
        options: generateNumberLineOptions({
          range: [0, 10],
          numDivisions: 5,
          tickStep: null,
          correctX: 2.5,
        }),
      },
    });
    const userInput = solve(item.question.widgets, 'number-line 1');
    expect(scoresCorrect(item, { 'number-line 1': userInput })).toBe(true);
  });

  it.each([
    [{ range: [0, 1], numDivisions: 5, divisionRange: [2, 10], correctX: 0 }, 5],
    [{ range: [0, 1], numDivisions: 5, divisionRange: [2, 10], correctX: 0.4 }, 5],
    [{ range: [0, 10], numDivisions: 5, divisionRange: [3, 10], correctX: 5, isTickCtrl: true }, 4],
    [{ range: [0, 4], numDivisions: null, tickStep: 0.5, divisionRange: [1, 10], correctX: 2 }, 8],
    [{ range: [0, 4], numDivisions: null, tickStep: 0.5, divisionRange: [1, 10] }, 8],
    [{ range: [0, 4], numDivisions: 20, divisionRange: [1, 10], isTickCtrl: true }, 10],
    [
      {
        range: [0.1, 0.5],
        numDivisions: 3,
        divisionRange: [1, 12],
        correctX: 0.3,
        isTickCtrl: true,
      },
      2,
    ],
    [{ range: [0, 20], numDivisions: 20, divisionRange: [1, 10], correctX: 7 }, 20],
    [{ range: [0, 10], numDivisions: 5, divisionRange: [3, 10], correctX: 5 }, 5],
  ])('draws a number line with options %p with %p divisions', (options, numDivisions) => {
    const userInput = widgetSolver(
      'number-line',
      generateNumberLineOptions({ tickStep: null, ...options }),
    );
    expect(userInput.numDivisions).toBe(numDivisions);
  });

  it('throws for a numeric-input whose correct answer has no value', () => {
    expect(() =>
      widgetSolver('numeric-input', {
        answers: [{ status: 'correct', value: null, simplify: 'required', strict: false }],
      }),
    ).toThrow();
  });

  it('throws for a numeric-input with no correct answer', () => {
    const item = makeItem({
      'numeric-input 1': {
        type: 'numeric-input',
        graded: true,
        options: {
          answers: [
            {
              value: 42,
              status: 'wrong',
              message: '',
              simplify: 'required',
              strict: false,
              maxError: null,
              answerForms: [],
            },
          ],
          size: 'normal',
          coefficient: false,
          labelText: '',
          rightAlign: false,
          static: false,
        },
      },
    });
    expect(() => solve(item.question.widgets, 'numeric-input 1')).toThrow();
  });
});
