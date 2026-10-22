import { createTranslator } from 'kolibri/utils/i18n';
import { wrapPerseusMessages } from '../translationUtils';
import perseusTranslator from '../translator';

const strings = wrapPerseusMessages(
  createTranslator('PerseusTranslationUtilsTest', {
    plain: 'Check',
    placeholder: 'Point at { x }',
    plainWithContext: { message: 'Hint', context: 'Button label' },
    placeholderWithContext: { message: 'Point at { x }', context: 'Screen reader label' },
  }),
);

describe('wrapPerseusMessages', () => {
  it('returns messages without placeholders as strings', () => {
    expect(strings.plain).toBe('Check');
    expect(strings.plainWithContext).toBe('Hint');
  });

  it('returns messages with placeholders as functions of their arguments', () => {
    expect(strings.placeholder({ x: '3' })).toBe('Point at 3');
    expect(strings.placeholderWithContext({ x: '3' })).toBe('Point at 3');
  });
});

describe('Perseus plural messages', () => {
  const perseusStrings = wrapPerseusMessages(perseusTranslator);

  it.each([
    [{ used: 0, num: 500 }, '0 / 500 Characters'],
    [{ used: 1, num: 500 }, '1 / 500 Characters'],
    [{ used: 2, num: 1 }, '2 / 1 Character'],
  ])('counts characters %p as %p', (counts, text) => {
    expect(perseusStrings.characterCount(counts)).toBe(text);
  });
});
