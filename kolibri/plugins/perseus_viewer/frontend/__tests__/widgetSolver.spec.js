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
    [0.123, '0.123'],
  ])('answers an input-number %p, which must be simplified, as %p', (value, currentValue) => {
    const item = makeItem(inputNumberWidgets({ value, simplify: 'required' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(userInput).toEqual({ currentValue });
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
  ])('answers an input-number of answer type %p with value %p', (answerType, value) => {
    const item = makeItem(inputNumberWidgets({ value, answerType, simplify: 'required' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(scoresCorrect(item, { 'input-number 1': userInput })).toBe(true);
  });

  it.each([
    [1e-7, '0.0000001'],
    [1.5e-7, '0.00000015'],
  ])('answers an input-number %p, which must be simplified, as %p', (value, currentValue) => {
    const item = makeItem(inputNumberWidgets({ value, simplify: 'required' }));
    const userInput = solve(item.question.widgets, 'input-number 1');
    expect(userInput).toEqual({ currentValue });
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
    [{ value: 0.25, strict: true, answerForms: ['decimal'] }],
    [{ value: 2 * Math.PI, strict: true, answerForms: ['pi'] }],
    [{ value: 0.123, strict: false }],
    [{ value: 2.718, strict: false }],
    [{ value: 2, strict: true, answerForms: ['integer', 'pi'] }],
    [{ value: 0.5, strict: true, answerForms: ['decimal', 'pi'] }],
    [{ value: 1e-7, strict: false }],
    [{ value: 6.02e23, strict: false }],
    [{ value: 1e21, strict: true, answerForms: ['integer'] }],
  ])('answers a numeric-input with answer %p', answer => {
    const item = makeItem(numericInputWidgets(answer));
    const userInput = solve(item.question.widgets, 'numeric-input 1');
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
    [{ range: [0, 10], numDivisions: 5, divisionRange: [3, 10], correctX: 5 }, 4],
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

  it('throws for an input-number whose value is not a number', () => {
    const item = makeItem(inputNumberWidgets({ value: '3/4', simplify: 'required' }));
    expect(() => solve(item.question.widgets, 'input-number 1')).toThrow();
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
