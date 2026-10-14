/**
 * Reads and writes numbers with a content language's separators and digits.
 *
 * The rules follow Studio's QTI editor, so authors and learners write numbers the same way, but
 * also read any script's digits as their ASCII digits would read: Studio rejects Thai `๓๐` and
 * reads `٣.٥` as 35.
 */

import { NumberFormatter, NumberParser } from '@internationalized/number';
import { localizeNumerals, normalizeNumerals } from './numeralNormalization';

// xsd:double lexical space without INF and NaN.
const xsdDoubleRegex = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

function parseXsdDouble(value) {
  if (!xsdDoubleRegex.test(value)) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readInLanguage(text, language) {
  const parser = new NumberParser(language);
  // `NumberParser` reads `.` as grouping beside Arabic-Indic digits in every language, so text
  // without Arabic separators is read as its ASCII digits would be. With them, ASCII digits from
  // a keyboard beside the keypad's `٫` are written in the language's digits, which it reads.
  // Arabic keyboards type `,` or `،` for the Arabic decimal, which it reads beside those digits.
  const arabicSeparators = /[٫٬]/.test(text) || (/[٠-٩۰-۹]/.test(text) && /[,،]/.test(text));
  const input = arabicSeparators ? localizeNumerals(text, language) : normalizeNumerals(text);
  // `parse` alone takes JavaScript literals such as `0x10` and `Infinity`.
  if (!parser.isValidPartialNumber(input)) {
    return null;
  }
  const number = parser.parse(input);
  return Number.isFinite(number) ? number : null;
}

// `String(number)` writes an exponent below 1e-6 and from 1e21, which text typed without one
// shouldn't be stored or shown with. 21 significant digits shows every digit it would.
const PLAIN_OPTIONS = { useGrouping: false, maximumSignificantDigits: 21 };
const PLAIN_NUMBER = new Intl.NumberFormat('en', PLAIN_OPTIONS);

/**
 * Reads the canonical xsd:double out of `text` typed in `language`, or keeps `text` when it
 * is an xsd:double the language can't read, so French `1,5` reads as 1.5 and `1.50` as 1.50.
 * @param {string} text - What the learner typed
 * @param {string} [language] - BCP 47 tag; falsy reads xsd:double only
 * @returns {string|null} The xsd:double, or null if it can't be read
 */
export function readLocaleNumber(text, language) {
  const trimmed = text.trim();
  // `NumberParser` reads a leading `+` only in some languages.
  const unsigned = trimmed.replace(/^\+(?![+-])/, '');
  const number = language ? readInLanguage(unsigned, language) : null;
  if (number !== null) {
    const canonical = String(number);
    return /e/.test(canonical) && !/e/i.test(trimmed) ? PLAIN_NUMBER.format(number) : canonical;
  }
  const ascii = normalizeNumerals(trimmed);
  return parseXsdDouble(ascii) === null ? null : ascii;
}

/**
 * Formats a stored xsd:double for display in `language`, without grouping.
 * @param {string} value - The stored xsd:double
 * @param {string} [language] - BCP 47 tag; falsy returns `value` unchanged
 * @returns {string} The formatted value; `value` unchanged if it is not an xsd:double, has
 * an exponent, or the language can't read it back
 */
export function formatLocaleNumber(value, language) {
  const number = parseXsdDouble(value);
  if (!language || number === null || /e/i.test(value)) {
    return value;
  }
  // Without bidi marks: `ar-EG`'s U+061C would show the minus right of the number in the ltr
  // answer field.
  const formatted = new NumberFormatter(language, PLAIN_OPTIONS)
    // `-0` reads as 0, so it is shown as `0`.
    .format(number || 0)
    .replace(/\p{Cf}/gu, '');
  // ICU versions differ in the separators they write; never show what reads as another number.
  return parseXsdDouble(readLocaleNumber(formatted, language) ?? '') === number ? formatted : value;
}

const symbolsCache = new Map();

/**
 * The digits and decimal separator to write numbers with in `language`, falling back to ASCII
 * digits and `.` where the language can't read its own back.
 * @param {string} [language] - BCP 47 tag
 * @returns {{ digits: string[], decimal: string }} `digits[n]` is the digit for n
 */
export function getLocaleNumberSymbols(language) {
  if (!symbolsCache.has(language)) {
    // Array.from: some scripts' digits are outside the BMP.
    const [zero, decimal, ...nonZero] = Array.from(formatLocaleNumber('0.123456789', language));
    symbolsCache.set(language, { digits: [zero, ...nonZero], decimal });
  }
  return symbolsCache.get(language);
}
