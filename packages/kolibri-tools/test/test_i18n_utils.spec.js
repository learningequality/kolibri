import { toLocale } from '../lib/i18n/utils';

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
});
