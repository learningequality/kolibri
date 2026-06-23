import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
import { scorePerseusItem, emptyWidgetsFunctional } from '@khanacademy/perseus-score';
import { normalizeUserInput } from '../numeralNormalization';

function migrateItem(rawItem) {
  const result = parseAndMigratePerseusItem(rawItem);
  if (isFailure(result)) {
    throw new Error('Failed to migrate item: ' + result.detail.message);
  }
  return result.value;
}

function makeItem(widgets, content) {
  return migrateItem({
    question: { content, images: {}, widgets },
    answerArea: {},
    hints: [],
    itemDataVersion: { major: 0, minor: 1 },
  });
}

// KA content in Kolibri channels predominantly uses the legacy input-number
// widget. As of perseus-score v8.3+, input-number is scored by converting its
// options and delegating to the numeric-input scorer, so these tests guard
// the scoring path our checkAnswer() actually exercises.
function makeInputNumberItem(options = {}) {
  return makeItem(
    {
      'input-number 1': {
        type: 'input-number',
        graded: true,
        options: {
          value: 42,
          simplify: 'required',
          size: 'normal',
          inexact: false,
          maxError: 0.1,
          answerType: 'number',
          rightAlign: false,
          ...options,
        },
      },
    },
    '[[☃ input-number 1]]',
  );
}

function makeNumericInputItem() {
  return makeItem(
    {
      'numeric-input 1': {
        type: 'numeric-input',
        graded: true,
        options: {
          answers: [
            {
              value: 42,
              status: 'correct',
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
    },
    '[[☃ numeric-input 1]]',
  );
}

function isCorrect(score) {
  return score.type === 'points' && score.earned === score.total;
}

describe('scorePerseusItem', () => {
  describe('input-number widget (scored via numeric-input delegation)', () => {
    it('scores a correct integer answer as correct', () => {
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '42' } };
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a wrong answer as incorrect', () => {
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '41' } };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('scores a correct decimal answer as correct', () => {
      const item = makeInputNumberItem({ value: 3.14, answerType: 'decimal' });
      const userInput = { 'input-number 1': { currentValue: '3.14' } };
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a correct answer after numeral normalization', () => {
      // The checkAnswer() path: Eastern Arabic input is normalized to ASCII
      // before being handed to the scorer.
      const item = makeInputNumberItem();
      const userInput = normalizeUserInput({ 'input-number 1': { currentValue: '٤٢' } });
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores fractions for rational answer types', () => {
      const item = makeInputNumberItem({ value: 0.5, answerType: 'rational' });
      const userInput = { 'input-number 1': { currentValue: '1/2' } };
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores empty input as invalid, not via emptyWidgetsFunctional', () => {
      // input-number registers no validator (same in perseus-score 8.2.x),
      // so emptyWidgetsFunctional never reports it; empty input instead
      // surfaces as an invalid score, which checkAnswer() treats as incorrect.
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '' } };
      const empty = emptyWidgetsFunctional(
        item.question.widgets,
        ['input-number 1'],
        userInput,
        'en',
      );
      expect(empty).toEqual([]);
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('invalid');
    });

    it('includes a per-widget score map in the result', () => {
      // Additive in perseus-score v8: scorePerseusItem returns widgetScores.
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '42' } };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.widgetScores['input-number 1'].type).toBe('points');
    });
  });

  describe('numeric-input widget', () => {
    it('scores a correct answer as correct', () => {
      const item = makeNumericInputItem();
      const userInput = { 'numeric-input 1': { currentValue: '42' } };
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a wrong answer as incorrect', () => {
      const item = makeNumericInputItem();
      const userInput = { 'numeric-input 1': { currentValue: '7' } };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('scores a correct answer after numeral normalization', () => {
      const item = makeNumericInputItem();
      const userInput = normalizeUserInput({ 'numeric-input 1': { currentValue: '٤٢' } });
      expect(isCorrect(scorePerseusItem(item.question, userInput, 'en'))).toBe(true);
    });
  });
});
