/**
 * Normalizes non-Western Arabic numerals to Western Arabic (ASCII 0-9).
 *
 * Many writing systems have their own digit characters. Perseus' scoring
 * engine uses parseFloat/parseInt which only understand ASCII digits.
 * This module transliterates any recognized non-Western digits so that
 * users can type answers using their native keyboard/numeral system.
 *
 * Uses Unicode property escapes (\p{Nd}) to match decimal digits from
 * any script — no hardcoded character ranges needed. This automatically
 * covers current and future Unicode numeral systems.
 */

// Matches any Unicode decimal digit that is NOT ASCII 0-9.
// \p{Nd} = Unicode "Decimal_Digit_Number" category (all scripts).
// [0-9] is excluded so we only process non-Western digits.
const nonWesternDigitRegex = /(?![0-9])\p{Nd}/gu;

// Single-character test for any decimal digit (used in the base-finding loop).
const singleNdRegex = /\p{Nd}/u;

/**
 * Replace any non-Western digit character with its ASCII equivalent.
 *
 * Unicode guarantees that decimal digits 0-9 are contiguous in every
 * script. We find the block's "zero" by walking backwards (at most 9
 * steps), then subtract to get the digit value.
 * @param {string} str - String that may contain non-Western digits
 * @returns {string} The string with non-Western digits converted to ASCII
 */
function normalizeNumerals(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(nonWesternDigitRegex, char => {
    const code = char.codePointAt(0);
    // Walk backwards to find the first character in this digit block
    // (i.e., the script's "zero"). At most 9 steps.
    let base = code;
    while (base > 0 && singleNdRegex.test(String.fromCodePoint(base - 1))) {
      base--;
    }
    return String(code - base);
  });
}

/**
 * Recursively apply a string transformation to all string values in
 * a nested object/array structure. Non-string leaves pass through unchanged.
 * @param {unknown} input - Object, array, or leaf to recurse through
 * @param {(s: string) => string} fn - Transform applied to each string leaf
 * @returns {unknown} A copy of input with fn applied to every string leaf
 */
function deepMapStrings(input, fn) {
  if (typeof input === 'string') {
    return fn(input);
  }
  if (Array.isArray(input)) {
    return input.map(item => deepMapStrings(item, fn));
  }
  if (input !== null && typeof input === 'object') {
    const result = {};
    for (const key in input) {
      result[key] = deepMapStrings(input[key], fn);
    }
    return result;
  }
  return input;
}

/**
 * Recursively normalize all string values in a user input object.
 * Handles the nested structures returned by getUserInput(), e.g.:
 * { "numeric-input 1": { currentValue: "٤٢" } }
 * { "expression 1": "٢x+٣" }
 * { "radio 1": { selectedChoiceIds: ["radio-choice-1"] } }
 *
 * Non-string values (numbers, booleans, arrays of non-strings) pass through
 * unchanged. Choice IDs like "radio-choice-1" contain only ASCII so they
 * are unaffected by normalization.
 * @param {object} input - User-input object from getUserInput()
 * @returns {object} The input with string values normalized
 */
function normalizeUserInput(input) {
  return deepMapStrings(input, normalizeNumerals);
}

// Cache for getLocalizedDigits — keyed by locale string.
const _digitCache = {};

/**
 * Get the localized digits 0-9 for a locale using Intl.NumberFormat.
 * Returns null if the locale's digits are identical to ASCII 0-9
 * (meaning no character remapping is needed for display or input).
 * Otherwise returns an array of 10 strings representing digits 0-9.
 * Results are cached per locale.
 * @param {string} locale - BCP 47 locale code
 * @returns {string[]|null} Locale digits 0-9; null for ASCII
 */
function getLocalizedDigits(locale) {
  if (!locale) {
    return null;
  }
  if (locale in _digitCache) {
    return _digitCache[locale];
  }
  try {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const digits = [];
    for (let i = 0; i < 10; i++) {
      digits.push(formatter.format(i));
    }
    // If all digits match ASCII, no remapping is needed
    const result = digits.every((d, i) => d === String(i)) ? null : digits;
    _digitCache[locale] = result;
    return result;
  } catch (e) {
    _digitCache[locale] = null;
    return null;
  }
}

/**
 * Convert ASCII digits in a string to localized digits for a given locale.
 * The reverse of normalizeNumerals: "42" → "٤٢" for Arabic.
 * Returns the string unchanged if the locale's digits match ASCII.
 * @param {string} str - String whose ASCII digits to localize
 * @param {string} locale - BCP 47 locale code
 * @returns {string} Localized string
 */
function localizeNumerals(str, locale) {
  if (typeof str !== 'string') {
    return str;
  }
  const digits = getLocalizedDigits(locale);
  if (!digits) {
    return str;
  }
  return str.replace(/[0-9]/g, d => digits[Number(d)]);
}

/**
 * Recursively localize all string values in a user input object.
 * The reverse of normalizeUserInput: converts ASCII digits back to
 * the locale's native numeral system for display in widgets.
 *
 * Used when restoring saved answer state so that users see their
 * answers in their native numeral format, not as ASCII digits.
 * @param {object} input - User-input object to localize
 * @param {string} locale - BCP 47 locale code
 * @returns {object} Input with string values localized
 */
function localizeUserInput(input, locale) {
  if (!getLocalizedDigits(locale)) {
    return input;
  }
  return deepMapStrings(input, s => localizeNumerals(s, locale));
}

export {
  normalizeNumerals,
  normalizeUserInput,
  getLocalizedDigits,
  localizeNumerals,
  localizeUserInput,
};
