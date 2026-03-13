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

export { normalizeNumerals, normalizeUserInput, nonWesternDigitRegex };
