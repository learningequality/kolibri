import { scorePerseusItem, emptyWidgetsFunctional } from '@khanacademy/perseus-score';
import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
import radioItem from './fixtures/radio-item.json';
import numericInputItem from './fixtures/numeric-input-item.json';
import expressionItem from './fixtures/expression-item.json';
import inputNumberItem from './fixtures/input-number-item.json';
import dropdownItem from './fixtures/dropdown-item.json';

function migrateItem(rawItem) {
  const result = parseAndMigratePerseusItem(rawItem);
  if (isFailure(result)) {
    throw new Error('Failed to migrate item: ' + result.detail.message);
  }
  return result.value;
}

describe('parseAndMigratePerseusItem', () => {
  it('migrates a radio item successfully', () => {
    const item = migrateItem(radioItem);
    expect(item.question).toBeDefined();
    expect(item.question.widgets['radio 1']).toBeDefined();
    expect(item.hints).toBeInstanceOf(Array);
  });

  it('migrates a numeric-input item successfully', () => {
    const item = migrateItem(numericInputItem);
    expect(item.question.widgets['numeric-input 1']).toBeDefined();
  });

  it('migrates an expression item successfully', () => {
    const item = migrateItem(expressionItem);
    expect(item.question.widgets['expression 1']).toBeDefined();
  });

  it('migrates an input-number item successfully', () => {
    const item = migrateItem(inputNumberItem);
    expect(item.question.widgets['input-number 1']).toBeDefined();
  });
});

describe('scorePerseusItem', () => {
  describe('radio widget', () => {
    let item;
    beforeAll(() => {
      item = migrateItem(radioItem);
    });

    it('returns correct for the right answer', () => {
      // After migration, choices have ids like "radio-choice-0", "radio-choice-1", etc.
      // Choice at index 1 ("4") is correct
      const userInput = {
        'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('returns incorrect for a wrong answer', () => {
      const userInput = {
        'radio 1': { selectedChoiceIds: ['radio-choice-0'] },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('returns invalid for empty answer', () => {
      const userInput = {
        'radio 1': { selectedChoiceIds: [] },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('invalid');
    });
  });

  describe('numeric-input widget', () => {
    let item;
    beforeAll(() => {
      item = migrateItem(numericInputItem);
    });

    it('returns correct for the right numeric answer', () => {
      const userInput = {
        'numeric-input 1': { currentValue: '21' },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('returns incorrect for a wrong numeric answer', () => {
      const userInput = {
        'numeric-input 1': { currentValue: '22' },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });

    it('returns invalid for empty input', () => {
      const userInput = {
        'numeric-input 1': { currentValue: '' },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('invalid');
    });
  });

  describe('expression widget', () => {
    let item;
    beforeAll(() => {
      item = migrateItem(expressionItem);
    });

    it('returns correct for the right expression', () => {
      const userInput = {
        'expression 1': '5x',
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('returns incorrect for a wrong expression', () => {
      const userInput = {
        'expression 1': '3x',
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });
  });

  describe('dropdown widget', () => {
    let item;
    beforeAll(() => {
      item = migrateItem(dropdownItem);
    });

    it('returns correct for the right dropdown selection', () => {
      const userInput = {
        'dropdown 1': { value: 2 },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('returns incorrect for a wrong dropdown selection', () => {
      const userInput = {
        'dropdown 1': { value: 1 },
      };
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(0);
    });
  });
});

describe('emptyWidgetsFunctional', () => {
  it('detects empty radio widget', () => {
    const item = migrateItem(radioItem);
    const userInput = {
      'radio 1': { selectedChoiceIds: [] },
    };
    const emptyWidgets = emptyWidgetsFunctional(
      item.question.widgets,
      ['radio 1'],
      userInput,
      'en',
    );
    expect(emptyWidgets).toContain('radio 1');
  });

  it('reports no empty widgets when answered', () => {
    const item = migrateItem(radioItem);
    const userInput = {
      'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
    };
    const emptyWidgets = emptyWidgetsFunctional(
      item.question.widgets,
      ['radio 1'],
      userInput,
      'en',
    );
    expect(emptyWidgets).not.toContain('radio 1');
  });

  it('scores empty numeric-input as invalid', () => {
    // numeric-input doesn't have a separate validator, so emptyWidgetsFunctional
    // won't detect it. Instead, scoring with empty input returns "invalid".
    const item = migrateItem(numericInputItem);
    const userInput = {
      'numeric-input 1': { currentValue: '' },
    };
    const score = scorePerseusItem(item.question, userInput, 'en');
    expect(score.type).toBe('invalid');
  });
});
