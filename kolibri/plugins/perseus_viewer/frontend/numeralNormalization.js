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

/**
 * Recursively normalize all string values in a user input object.
 * Handles the nested structures returned by getUserInput(), e.g.:
 *   { "numeric-input 1": { currentValue: "٤٢" } }
 *   { "expression 1": "٢x+٣" }
 *   { "radio 1": { selectedChoiceIds: ["radio-choice-1"] } }
 *
 * Non-string values (numbers, booleans, arrays of non-strings) pass through
 * unchanged. Choice IDs like "radio-choice-1" contain only ASCII so they
 * are unaffected by normalization.
 */
function normalizeUserInput(input) {
  return deepMapStrings(input, normalizeNumerals);
}

// Cache for getLocalizedDigits — keyed by locale string.
const _digitCache = {};

/**
 * Get the localized digits 0-9 for a locale using Intl.NumberFormat.
 * Returns null if the locale uses Western Arabic numerals (no localization needed).
 * Otherwise returns an array of 10 strings: [localizedZero, ..., localizedNine].
 * Results are cached per locale.
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
    // If all digits are the same as ASCII, no localization is needed
    const result = digits.every((d, i) => d === String(i)) ? null : digits;
    _digitCache[locale] = result;
    return result;
  } catch (e) {
    _digitCache[locale] = null;
    return null;
  }
}

/**
 * Localize the on-screen keypad's digit buttons for a given locale.
 *
 * The MobileKeypad renders digits as SVG paths (for pixel-perfect rendering).
 * This function replaces the SVG with a styled text span showing the localized
 * digit, while preserving the button's aria-label for accessibility.
 *
 * @param {Element} keypadContainer - The keypad's root DOM element
 * @param {string} locale - The content locale (e.g., 'ar', 'hi', 'bn')
 * @returns {MutationObserver|null} An observer watching for re-renders, or null
 *   if no localization was needed. Call .disconnect() on cleanup.
 */
function localizeKeypadDigits(keypadContainer, locale) {
  const digits = getLocalizedDigits(locale);
  if (!digits) {
    return null;
  }

  function applyLocalization() {
    for (let i = 0; i < 10; i++) {
      const btn = keypadContainer.querySelector(`button[aria-label="${i}"]`);
      if (!btn) {
        continue;
      }
      // Skip if we've already localized this button
      if (btn.dataset.localizedDigit === digits[i]) {
        continue;
      }
      const svg = btn.querySelector('svg');
      if (!svg) {
        continue;
      }
      // Hide the SVG and insert a text span in its place
      svg.style.display = 'none';
      // Remove any previously inserted span (in case of re-localization)
      const existing = btn.querySelector('.localized-digit');
      if (existing) {
        existing.textContent = digits[i];
      } else {
        const span = document.createElement('span');
        span.className = 'localized-digit';
        span.textContent = digits[i];
        span.style.cssText =
          'font-size: 22px; font-weight: 700; color: #21242C; ' +
          'display: flex; align-items: center; justify-content: center; ' +
          'width: 40px; height: 40px;';
        svg.parentNode.insertBefore(span, svg);
      }
      btn.dataset.localizedDigit = digits[i];
    }
  }

  applyLocalization();

  // Watch for React re-renders that might reset our DOM changes
  const observer = new MutationObserver(applyLocalization);
  observer.observe(keypadContainer, { childList: true, subtree: true });
  return observer;
}

export {
  normalizeNumerals,
  normalizeUserInput,
  getLocalizedDigits,
  localizeKeypadDigits,
};
