import { createTranslator } from 'kolibri/utils/i18n';
import perseusTranslator from '../translator';
import { wrapPerseusMessages } from '../translationUtils';

describe('wrapPerseusMessages', () => {
  describe.each([
    ['with Proxy', window.Proxy],
    ['without Proxy', undefined],
  ])('%s', (_label, proxy) => {
    const translator = createTranslator('PerseusTranslationUtilsTest', {
      translated: 'Definition of: { word }',
    });
    const wordLabel = ({ word }) => word;
    let strings;

    beforeEach(() => {
      const originalProxy = window.Proxy;
      try {
        window.Proxy = proxy;
        strings = wrapPerseusMessages(translator, {
          translated: wordLabel,
        });
      } finally {
        window.Proxy = originalProxy;
      }
    });

    it('formats a translated message when both sources contain it', () => {
      expect(strings.translated({ word: 'polígono' })).toBe('Definition of: polígono');
    });
  });

  it('uses the untranslated definition label with the release translator without Proxy', () => {
    const originalProxy = window.Proxy;
    let strings;
    try {
      window.Proxy = undefined;
      strings = wrapPerseusMessages(perseusTranslator, {
        definitionIdentifier: ({ word }) => word,
      });
    } finally {
      window.Proxy = originalProxy;
    }
    expect(strings.definitionIdentifier({ word: 'polígono' })).toBe('polígono');
  });
});
