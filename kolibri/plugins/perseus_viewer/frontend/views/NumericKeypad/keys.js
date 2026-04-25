/**
 * Static key definitions for the NumericKeypad.
 *
 * Only two things are dynamic at runtime:
 * 1. Digit labels — localized to the content's numeral system
 * 2. The multiplication key in expression mode — × vs · based on Perseus config
 *
 * Everything else (operator keys, grid positions, aria labels) is defined here
 * as module-level constants.
 */
import translator from '../../translator';

const {
  percent$,
  pi$,
  fractionExcludingExpression$,
  decimal$,
  negative$,
  delete$,
  times$,
  plus$,
  leftParenthesis$,
  divide$,
  minus$,
  rightParenthesis$,
  equalsSign$,
  customExponent$,
  squareRoot$,
} = translator;

/**
 * @typedef {object} KeyDef
 * @property {string} id - Stable key identifier
 * @property {string} label - Display label
 * @property {Function} ariaLabel - Returns the accessible label
 * @property {boolean} [secondary] - Shifted/secondary key
 * @property {object} [gridStyle] - CSS grid placement
 */

// --- Operator keys (static) ---

const PERCENT = {
  id: 'PERCENT',
  label: '%',
  ariaLabel: percent$,
  secondary: true,
};

const PI = {
  id: 'PI',
  label: 'π',
  ariaLabel: pi$,
  secondary: true,
};

const FRAC = {
  id: 'FRAC',
  label: '⁄',
  ariaLabel: fractionExcludingExpression$,
  secondary: true,
};

const DECIMAL = {
  id: 'DECIMAL',
  label: '.',
  ariaLabel: decimal$,
};

const NEGATIVE = {
  id: 'NEGATIVE',
  label: '(−)',
  ariaLabel: negative$,
};

const BACKSPACE = {
  id: 'BACKSPACE',
  label: '⌫',
  ariaLabel: delete$,
  secondary: true,
};

const PLUS = {
  id: 'PLUS',
  label: '+',
  ariaLabel: plus$,
  secondary: true,
};

const LEFT_PAREN = {
  id: 'LEFT_PAREN',
  label: '(',
  ariaLabel: leftParenthesis$,
  secondary: true,
};

const DIVIDE = {
  id: 'DIVIDE',
  label: '÷',
  ariaLabel: divide$,
  secondary: true,
};

const MINUS = {
  id: 'MINUS',
  label: '−',
  ariaLabel: minus$,
  secondary: true,
};

const RIGHT_PAREN = {
  id: 'RIGHT_PAREN',
  label: ')',
  ariaLabel: rightParenthesis$,
  secondary: true,
};

const EQUAL = {
  id: 'EQUAL',
  label: '=',
  ariaLabel: equalsSign$,
  secondary: true,
};

const EXP = {
  id: 'EXP',
  label: 'xⁿ',
  ariaLabel: customExponent$,
  secondary: true,
};

const SQRT = {
  id: 'SQRT',
  label: '√',
  ariaLabel: squareRoot$,
  secondary: true,
};

// --- Layout helpers ---

/**
 * Attach a grid position to a key definition.
 * Returns a new object to avoid mutating the constant.
 * @param {object} key - Key definition to position
 * @param {number} col - Zero-based grid column
 * @param {number} row - Zero-based grid row
 * @returns {KeyDef} Positioned copy of key
 */
function at(key, col, row) {
  return { ...key, gridStyle: { gridColumn: col + 1, gridRow: row + 1 } };
}

/**
 * Create a digit key. Label is resolved at runtime from localizedDigits.
 * @param {number} n - Digit value
 * @param {number} col - Zero-based grid column
 * @param {number} row - Zero-based grid row
 * @param {string[]} localizedDigits - Glyphs indexed by digit value
 * @returns {KeyDef} A digit key definition
 */
function digit(n, col, row, localizedDigits) {
  const label = localizedDigits ? localizedDigits[n] : String(n);
  return {
    id: `NUM_${n}`,
    label,
    ariaLabel: () => label,
    gridStyle: { gridColumn: col + 1, gridRow: row + 1 },
  };
}

// --- Shared digit positions (same in both layouts) ---

function digitRow0(ld) {
  return [digit(7, 0, 0, ld), digit(8, 1, 0, ld), digit(9, 2, 0, ld)];
}
function digitRow1(ld) {
  return [digit(4, 0, 1, ld), digit(5, 1, 1, ld), digit(6, 2, 1, ld)];
}
function digitRow2(ld) {
  return [digit(1, 0, 2, ld), digit(2, 1, 2, ld), digit(3, 2, 2, ld)];
}

// --- Layouts ---

// FRACTION layout: 4 columns × 4 rows
// Row 0: 7 8 9 %
// Row 1: 4 5 6 π
// Row 2: 1 2 3 ⁄
// Row 3: 0 . (−) ⌫
export function fractionLayout(localizedDigits) {
  return [
    ...digitRow0(localizedDigits),
    at(PERCENT, 3, 0),
    ...digitRow1(localizedDigits),
    at(PI, 3, 1),
    ...digitRow2(localizedDigits),
    at(FRAC, 3, 2),
    digit(0, 0, 3, localizedDigits),
    at(DECIMAL, 1, 3),
    at(NEGATIVE, 2, 3),
    at(BACKSPACE, 3, 3),
  ];
}

// EXPRESSION layout: 6 columns × 4 rows
// Row 0: 7 8 9 ×/· + (
// Row 1: 4 5 6 ÷  − )
// Row 2: 1 2 3 =  ^ √
// Row 3: 0 . (−) ⁄  π %
export function expressionLayout(localizedDigits, useTimes) {
  const timesKey = {
    id: useTimes ? 'TIMES' : 'CDOT',
    label: useTimes ? '×' : '·',
    ariaLabel: times$,
    secondary: true,
  };

  return [
    ...digitRow0(localizedDigits),
    at(timesKey, 3, 0),
    at(PLUS, 4, 0),
    at(LEFT_PAREN, 5, 0),

    ...digitRow1(localizedDigits),
    at(DIVIDE, 3, 1),
    at(MINUS, 4, 1),
    at(RIGHT_PAREN, 5, 1),

    ...digitRow2(localizedDigits),
    at(EQUAL, 3, 2),
    at(EXP, 4, 2),
    at(SQRT, 5, 2),

    digit(0, 0, 3, localizedDigits),
    at(DECIMAL, 1, 3),
    at(NEGATIVE, 2, 3),
    at(FRAC, 3, 3),
    at(PI, 4, 3),
    at(PERCENT, 5, 3),
  ];
}
