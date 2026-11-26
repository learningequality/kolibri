import { parseAndMigratePerseusItem, isFailure } from '@khanacademy/perseus-core';
import fixtures from '../../../../../integration_testing/viewer_sandbox/frontend/__fixtures__/perseus';
import { scoreItem } from '../scoring';
import solveWidget from '../widgetSolver';

describe('show-answer', () => {
  it.each(fixtures.map(({ title, item }) => [title, item]))(
    'earns full points for %s',
    (_, item) => {
      const result = parseAndMigratePerseusItem(JSON.parse(item));
      if (isFailure(result)) {
        throw new Error(result.detail.message);
      }
      const { question } = result.value;
      const userInput = {};
      for (const [id, { type, graded, options }] of Object.entries(question.widgets)) {
        if (graded) {
          const handleUserInput = input => {
            userInput[id] = input;
          };
          solveWidget({ props: { handleUserInput } }, type, options);
        }
      }
      const score = scoreItem(question, userInput, 'en');
      expect(score.type).toBe('points');
      expect(score.total).toBeGreaterThan(0);
      expect(score.earned).toBe(score.total);
    },
  );
});
