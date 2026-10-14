/**
 * Static key definitions for the NumericKeypad.
 *
 * Only three things are dynamic at runtime:
 * 1. Digit and decimal labels — the content language's symbols
 * 2. The multiplication key in expression mode — × vs · based on Perseus config
 * 3. The divide key's label in expression mode — ÷ vs : based on the host
 *
 * Everything else (operator keys, grid positions, aria labels) is defined here
 * as module-level constants.
 */
import translator from '../../strings/numericKeypadStrings';

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
 * Create a digit key. Label is resolved at runtime from the language's symbols.
 * @param {number} n - Digit value
 * @param {number} col - Zero-based grid column
 * @param {number} row - Zero-based grid row
 * @param {{ digits: string[] }} symbols - From getLocaleNumberSymbols
 * @returns {KeyDef} A digit key definition
 */
function digit(n, col, row, symbols) {
  const label = symbols.digits[n];
  return {
    id: `NUM_${n}`,
    label,
    ariaLabel: () => label,
    gridStyle: { gridColumn: col + 1, gridRow: row + 1 },
  };
}

// --- Shared digit positions (same in both layouts) ---

function digitRow0(s) {
  return [digit(7, 0, 0, s), digit(8, 1, 0, s), digit(9, 2, 0, s)];
}
function digitRow1(s) {
  return [digit(4, 0, 1, s), digit(5, 1, 1, s), digit(6, 2, 1, s)];
}
function digitRow2(s) {
  return [digit(1, 0, 2, s), digit(2, 1, 2, s), digit(3, 2, 2, s)];
}

function decimal(col, row, symbols) {
  return at({ id: 'DECIMAL', label: symbols.decimal, ariaLabel: decimal$ }, col, row);
}

// --- Layouts ---

// FRACTION layout: 4 columns × 4 rows
// Row 0: 7 8 9 %
// Row 1: 4 5 6 π
// Row 2: 1 2 3 ⁄
// Row 3: 0 . (−) ⌫
export function fractionLayout(symbols) {
  return [
    ...digitRow0(symbols),
    at(PERCENT, 3, 0),
    ...digitRow1(symbols),
    at(PI, 3, 1),
    ...digitRow2(symbols),
    at(FRAC, 3, 2),
    digit(0, 0, 3, symbols),
    decimal(1, 3, symbols),
    at(NEGATIVE, 2, 3),
    at(BACKSPACE, 3, 3),
  ];
}

// EXPRESSION layout: 6 columns × 4 rows
// Row 0: 7 8 9 ×/· + (
// Row 1: 4 5 6 ÷  − )
// Row 2: 1 2 3 =  ^ √
// Row 3: 0 . (−) ⁄  π %
export function expressionLayout(symbols, useTimes, divideLabel) {
  const timesKey = {
    id: useTimes ? 'TIMES' : 'CDOT',
    label: useTimes ? '×' : '·',
    ariaLabel: times$,
    secondary: true,
  };

  return [
    ...digitRow0(symbols),
    at(timesKey, 3, 0),
    at(PLUS, 4, 0),
    at(LEFT_PAREN, 5, 0),

    ...digitRow1(symbols),
    at({ id: 'DIVIDE', label: divideLabel, ariaLabel: divide$, secondary: true }, 3, 1),
    at(MINUS, 4, 1),
    at(RIGHT_PAREN, 5, 1),

    ...digitRow2(symbols),
    at(EQUAL, 3, 2),
    at(EXP, 4, 2),
    at(SQRT, 5, 2),

    digit(0, 0, 3, symbols),
    decimal(1, 3, symbols),
    at(NEGATIVE, 2, 3),
    at(FRAC, 3, 3),
    at(PI, 4, 3),
    at(PERCENT, 5, 3),
  ];
}
