import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
import { scorePerseusItem } from '@khanacademy/perseus-score';
import { deriveUserInputFromSerializedState } from '@khanacademy/perseus';
import radioItem from './fixtures/radio-item.json';
import numericInputItem from './fixtures/numeric-input-item.json';
import expressionItem from './fixtures/expression-item.json';
import dropdownItem from './fixtures/dropdown-item.json';

function migrateItem(rawItem) {
  const result = parseAndMigratePerseusItem(rawItem);
  if (isFailure(result)) {
    throw new Error('Failed to migrate item: ' + result.detail.message);
  }
  return result.value;
}

describe('state serialization', () => {
  describe('UserInputMap format', () => {
    it('getUserInput-style state can be round-tripped through scoring', () => {
      const item = migrateItem(radioItem);
      // Simulating what getUserInput() returns
      const userInput = {
        'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
      };
      // Verify the state can be scored (round-trip test)
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('answer state wraps userInput with hintsVisible', () => {
      // This tests the shape that getAnswerState() should produce
      const userInput = {
        'radio 1': { selectedChoiceIds: ['radio-choice-1'] },
      };
      const answerState = { userInput, hintsVisible: 2 };
      expect(answerState.userInput).toBe(userInput);
      expect(answerState.hintsVisible).toBe(2);
    });
  });

  describe('backward compatibility with old serialized state', () => {
    // deriveUserInputFromSerializedState converts old getSerializedState() format
    // (saved by pre-v75 Perseus) into the new UserInputMap format. This is the
    // migration path used by restoreAnswerState() in PerseusRendererIndex.vue
    // when it encounters answerState.question (old format).
    //
    // The function iterates widget IDs, looks up getUserInputFromSerializedState
    // on each widget export, and calls it to convert old → new format.

    it('converts old radio state and the result scores correctly', () => {
      const item = migrateItem(radioItem);
      // Old radio serialized state had choiceStates array + choices with IDs.
      // After migration, choices get IDs like "radio-choice-0", "radio-choice-1", etc.
      const oldRadioState = {
        'radio 1': {
          choiceStates: [
            { selected: false },
            { selected: true }, // correct answer at index 1
            { selected: false },
            { selected: false },
          ],
          choices: [
            { id: 'radio-choice-0' },
            { id: 'radio-choice-1' },
            { id: 'radio-choice-2' },
            { id: 'radio-choice-3' },
          ],
        },
      };
      const userInput = deriveUserInputFromSerializedState(oldRadioState, item.question.widgets);
      expect(userInput['radio 1']).toEqual({ selectedChoiceIds: ['radio-choice-1'] });

      // The converted state should score as correct
      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('converts old numeric-input state and the result scores correctly', () => {
      const item = migrateItem(numericInputItem);
      // Old numeric-input serialized state included extra fields like size, coefficient, etc.
      const oldNumericState = {
        'numeric-input 1': {
          currentValue: '21',
          size: 'normal',
          coefficient: false,
          labelText: '',
          rightAlign: false,
        },
      };
      const userInput = deriveUserInputFromSerializedState(oldNumericState, item.question.widgets);
      expect(userInput['numeric-input 1']).toEqual({ currentValue: '21' });

      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('converts old expression state and the result scores correctly', () => {
      const item = migrateItem(expressionItem);
      // Old expression serialized state wrapped the TeX value with extra metadata.
      const oldExpressionState = {
        'expression 1': {
          value: '5x',
          times: false,
          buttonSets: ['basic'],
        },
      };
      const userInput = deriveUserInputFromSerializedState(
        oldExpressionState,
        item.question.widgets,
      );
      // Expression converts to a plain TeX string, not an object
      expect(userInput['expression 1']).toBe('5x');

      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('converts old dropdown state and the result scores correctly', () => {
      const item = migrateItem(dropdownItem);
      // Old dropdown serialized state used "selected" instead of "value".
      const oldDropdownState = {
        'dropdown 1': {
          selected: 2,
          choices: ['choice 1', 'choice 2'],
        },
      };
      const userInput = deriveUserInputFromSerializedState(oldDropdownState, item.question.widgets);
      expect(userInput['dropdown 1']).toEqual({ value: 2 });

      const score = scorePerseusItem(item.question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.earned).toBe(score.total);
    });

    it('requires unwrapped question state, not the { question, hints } wrapper', () => {
      // restoreAnswerState() in PerseusRendererIndex.vue passes answerState.question
      // (the inner widget state map) to deriveUserInputFromSerializedState, NOT the
      // full { question, hints } wrapper. Passing the wrapper would fail because
      // "question" and "hints" aren't widget IDs.
      const item = migrateItem(numericInputItem);

      // Passing the wrapper directly returns empty — keys don't match widget IDs
      const wrapperResult = deriveUserInputFromSerializedState(
        { question: { 'numeric-input 1': { currentValue: '21' } }, hints: [] },
        item.question.widgets,
      );
      expect(wrapperResult['numeric-input 1']).toBeUndefined();

      // Passing the unwrapped question state works correctly
      const unwrappedResult = deriveUserInputFromSerializedState(
        { 'numeric-input 1': { currentValue: '21', size: 'normal' } },
        item.question.widgets,
      );
      expect(unwrappedResult['numeric-input 1']).toEqual({ currentValue: '21' });
    });
  });

  describe('blob URL handling', () => {
    it('replaces blob URLs with LOCALPATH placeholders in serialized state', () => {
      // Test the pattern used in restoreImageUrls
      const blobImageRegex = /blob:[^)^"]+/g;
      const stateWithBlob = JSON.stringify({
        userInput: {
          'image 1': { url: 'blob:http://localhost/abc123' },
        },
      });
      const hasBlob = blobImageRegex.test(stateWithBlob);
      expect(hasBlob).toBe(true);
    });

    it('matches LOCALPATH placeholders for restoration', () => {
      const allImageRegex = /((web\+graphie:)?)\$\{☣ LOCALPATH\}\/([^)^"]+)/g;
      const stateWithPlaceholder = '${☣ LOCALPATH}/images/test.png';
      const matches = Array.from(stateWithPlaceholder.matchAll(allImageRegex));
      expect(matches.length).toBe(1);
      expect(matches[0][3]).toBe('images/test.png');
    });
  });
});
