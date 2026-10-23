import { createTranslator } from 'kolibri/utils/i18n';
import { wrapPerseusMessages } from '../translationUtils';

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
