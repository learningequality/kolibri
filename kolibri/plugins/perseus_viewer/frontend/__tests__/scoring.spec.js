import { emptyWidgetsFunctional } from '@khanacademy/perseus-score';
import { localizeNumericResponses, readUserInput } from '../numericResponses';
import { scoreItem } from '../scoring';
import makeItem from '../testUtils/makeItem';

// KA content in Kolibri channels predominantly uses the legacy input-number
// widget. perseus-core 39 migrates its options to the numeric-input shape at
// parse, and perseus-score 8.12.26 scores input-number with the numeric-input
// scorer, so these tests guard the scoring path our checkAnswer() actually exercises.
function makeInputNumberItem(options = {}) {
  return makeItem({
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
  });
}

function numericInputWidgets(answer = {}) {
  return {
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

function makeNumericInputItem(answer = {}) {
  return makeItem(numericInputWidgets(answer));
}

function makeGroupItem(answer = {}) {
  return makeItem({
    'group 1': {
      type: 'group',
      graded: true,
      options: {
        content: '[[☃ numeric-input 1]]',
        images: {},
        widgets: numericInputWidgets(answer),
      },
    },
  });
}

function isCorrect(score) {
  return score.type === 'points' && score.earned === score.total;
}

describe('scoreItem', () => {
  describe('input-number widget (scored via numeric-input delegation)', () => {
    it('scores a correct integer answer as correct', () => {
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '42' } };
      expect(isCorrect(scoreItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a wrong answer as incorrect', () => {
      const item = makeInputNumberItem();
      const userInput = { 'input-number 1': { currentValue: '41' } };
      const score = scoreItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('scores a correct decimal answer as correct', () => {
      const item = makeInputNumberItem({ value: 3.14, answerType: 'decimal' });
      const userInput = { 'input-number 1': { currentValue: '3.14' } };
      expect(isCorrect(scoreItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a correct answer after numeral normalization', () => {
      const item = makeInputNumberItem();
      const userInput = readUserInput(
        { 'input-number 1': { currentValue: '٤٢' } },
        item.question.widgets,
        'ar-EG',
      );
      expect(isCorrect(scoreItem(item.question, userInput, 'ar-EG'))).toBe(true);
    });

    it('scores fractions for rational answer types', () => {
      const item = makeInputNumberItem({ value: 0.5, answerType: 'rational' });
      const userInput = { 'input-number 1': { currentValue: '1/2' } };
      expect(isCorrect(scoreItem(item.question, userInput, 'en'))).toBe(true);
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
      const score = scoreItem(item.question, userInput, 'en');
      expect(score.type).toBe('invalid');
    });
  });

  describe('numeric-input widget', () => {
    it('scores a correct answer as correct', () => {
      const item = makeNumericInputItem();
      const userInput = { 'numeric-input 1': { currentValue: '42' } };
      expect(isCorrect(scoreItem(item.question, userInput, 'en'))).toBe(true);
    });

    it('scores a wrong answer as incorrect', () => {
      const item = makeNumericInputItem();
      const userInput = { 'numeric-input 1': { currentValue: '7' } };
      const score = scoreItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('scores a correct answer after numeral normalization', () => {
      const item = makeNumericInputItem();
      const userInput = readUserInput(
        { 'numeric-input 1': { currentValue: '٤٢' } },
        item.question.widgets,
        'ar-EG',
      );
      expect(isCorrect(scoreItem(item.question, userInput, 'ar-EG'))).toBe(true);
    });
  });
});

const numericWidgets = [
  {
    id: 'numeric-input 1',
    makeItem: value => makeNumericInputItem({ value }),
    makePiItem: value => makeNumericInputItem({ value, answerForms: ['pi'] }),
    makeInput: text => ({ 'numeric-input 1': { currentValue: text } }),
  },
  {
    id: 'input-number 1',
    makeItem: (value, form = 'number') => makeInputNumberItem({ value, answerType: form }),
    makePiItem: value => makeInputNumberItem({ value, answerType: 'pi' }),
    makeInput: text => ({ 'input-number 1': { currentValue: text } }),
  },
  {
    id: 'group 1',
    makeItem: value => makeGroupItem({ value }),
    makePiItem: value => makeGroupItem({ value, answerForms: ['pi'] }),
    makeInput: text => ({ 'group 1': { 'numeric-input 1': { currentValue: text } } }),
  },
];

describe.each(numericWidgets)(
  '$id read in the content language',
  ({ makeItem, makePiItem, makeInput }) => {
    function save(item, userInput, language) {
      return readUserInput(userInput, item.question.widgets, language);
    }

    function scoresCorrect(item, text, language) {
      return isCorrect(scoreItem(item.question, save(item, makeInput(text), language), language));
    }

    it('reads Hindi lakh grouping', () => {
      expect(scoresCorrect(makeItem(1234567), '12,34,567', 'hi')).toBe(true);
    });

    it.each([
      ['space', '1 234,5'],
      ['narrow no-break space', '1\u202f234,5'],
    ])('reads French %s grouping', (_, text) => {
      expect(scoresCorrect(makeItem(1234.5), text, 'fr')).toBe(true);
    });

    it('reads French 1,234 as 1.234 only', () => {
      expect(scoresCorrect(makeItem(1.234), '1,234', 'fr')).toBe(true);
      expect(scoresCorrect(makeItem(1234), '1,234', 'fr')).toBe(false);
    });

    it('does not read English 1,23 as 1.23', () => {
      expect(scoresCorrect(makeItem(1.23), '1,23', 'en')).toBe(false);
    });

    it.each(['en', 'fr', 'hi'])('scores fractions and mixed numbers in %s', language => {
      expect(scoresCorrect(makeItem(0.5, 'rational'), '1/2', language)).toBe(true);
      expect(scoresCorrect(makeItem(1.5, 'mixed'), '1 1/2', language)).toBe(true);
    });

    it('scores Arabic-Indic fractions in ar-EG', () => {
      expect(scoresCorrect(makeItem(0.5, 'rational'), '١/٢', 'ar-EG')).toBe(true);
    });

    it.each([0.015, 1.5])('reads a French decimal percentage against %s', value => {
      expect(scoresCorrect(makeItem(value), '1,5\\%', 'fr')).toBe(true);
    });

    it('does not score a restored Pashto response it cannot read', () => {
      const item = makeItem(123);
      const saved = save(item, makeInput('1٫2٫3'), 'ps');
      const restored = localizeNumericResponses(saved, item.question.widgets, 'ps');
      expect(isCorrect(scoreItem(item.question, save(item, restored, 'ps'), 'ps'))).toBe(false);
    });

    it('scores French text it cannot read with French separators', () => {
      expect(scoresCorrect(makePiItem(1.5 * Math.PI), '1,5π', 'fr')).toBe(true);
    });
  },
);
