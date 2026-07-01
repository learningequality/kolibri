import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
import { deriveUserInputFromSerializedState, init } from '@khanacademy/perseus';
import sorterItem from './fixtures/sorter-item.json';

// deriveUserInputFromSerializedState reads the widget registry, which Perseus
// requires be populated first. Production does this via perseus.init() (see
// PerseusRendererIndex.vue); mirror it here.
init();

function migrateItem(rawItem) {
  const result = parseAndMigratePerseusItem(rawItem);
  if (isFailure(result)) {
    throw new Error('Failed to migrate item: ' + result.detail.message);
  }
  return result.value;
}

describe('state serialization', () => {
  // The sorter widget required special handling in the old Perseus integration.
  // Pre-v75, getSerializedState() didn't include the sorter's current ordering,
  // so addSorterState() manually extracted it via refs.sortable.getOptions().
  // This means saved answer states in the wild have sorter state with an
  // `options` array that needs to be properly converted by
  // deriveUserInputFromSerializedState.

  describe('sorter widget backward compatibility', () => {
    let item;
    beforeAll(() => {
      item = migrateItem(sorterItem);
    });

    it('preserves the options ordering from old serialized state', () => {
      // Old format: addSorterState injected the options array into the
      // serialized state from the sortable component's getOptions().
      // The correct answer order for the fixture is ['1', '2', '3', '4', '5'].
      const oldSorterState = {
        'sorter 1': { options: ['1', '2', '3', '4', '5'] },
      };
      const userInput = deriveUserInputFromSerializedState(oldSorterState, item.question.widgets);
      expect(userInput['sorter 1']).toBeDefined();
      expect(userInput['sorter 1'].options).toEqual(['1', '2', '3', '4', '5']);
    });

    it('preserves a scrambled ordering from old serialized state', () => {
      // A user who hadn't finished sorting would have a different order saved.
      const oldSorterState = {
        'sorter 1': { options: ['5', '3', '1', '4', '2'] },
      };
      const userInput = deriveUserInputFromSerializedState(oldSorterState, item.question.widgets);
      expect(userInput['sorter 1'].options).toEqual(['5', '3', '1', '4', '2']);
    });

    it('requires unwrapped question state, not the { question, hints } wrapper', () => {
      // restoreAnswerState() in PerseusRendererIndex.vue passes answerState.question
      // (the inner widget state map) to deriveUserInputFromSerializedState, NOT the
      // full { question, hints } wrapper.
      const wrapperResult = deriveUserInputFromSerializedState(
        { question: { 'sorter 1': { options: ['1', '2', '3', '4', '5'] } }, hints: [] },
        item.question.widgets,
      );
      expect(wrapperResult['sorter 1']).toBeUndefined();

      const unwrappedResult = deriveUserInputFromSerializedState(
        { 'sorter 1': { options: ['1', '2', '3', '4', '5'] } },
        item.question.widgets,
      );
      expect(unwrappedResult['sorter 1'].options).toEqual(['1', '2', '3', '4', '5']);
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
