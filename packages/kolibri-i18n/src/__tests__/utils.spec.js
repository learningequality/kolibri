import path from 'node:path';
import { toLocale, stripEnLcMessages } from '../utils';

const langLocales = [
  ['en', 'en'],
  ['EN', 'en'],
  ['en-us', 'en_US'],
  ['EN-US', 'en_US'],
  ['en_US', 'en_US'],
  // With > 2 characters after the dash.
  ['sr-latn', 'sr_Latn'],
  ['sr-LATN', 'sr_Latn'],
  ['sr_Latn', 'sr_Latn'],
  // 3-char language codes.
  ['ber-MA', 'ber_MA'],
  ['BER-MA', 'ber_MA'],
  ['BER_MA', 'ber_MA'],
  ['ber_MA', 'ber_MA'],
  // With private use subtag (x-informal).
  ['nl-nl-x-informal', 'nl_NL-x-informal'],
  ['NL-NL-X-INFORMAL', 'nl_NL-x-informal'],
  ['sr-latn-x-informal', 'sr_Latn-x-informal'],
  ['SR-LATN-X-INFORMAL', 'sr_Latn-x-informal'],
];

describe('i18n utils', () => {
  describe('langToLocale function', () => {
    it.each(langLocales)('Convert %s to %s', (lang, locale) => {
      expect(toLocale(lang)).toEqual(locale);
    });
  });

  describe('stripEnLcMessages', () => {
    it('strips a trailing en/LC_MESSAGES', () => {
      const base = path.join('python_packages', 'x', 'y', 'locale');
      expect(stripEnLcMessages(path.join(base, 'en', 'LC_MESSAGES'))).toEqual(base);
    });
    it('returns the path unchanged when the suffix is absent', () => {
      const p = path.join('kolibri', 'locale');
      expect(stripEnLcMessages(p)).toEqual(p);
    });
  });
});
