/**
 * QTI Expression Evaluator
 * Pure functions for parsing and evaluating QTI expressions
 * Designed to work optimally with Vue's reactivity system
 */
import { compile as compileXsdPattern } from 'xspattern';
import logger from 'kolibri-logging';
import { BASE_TYPE } from '../../constants';
import { areTypesCompatible, CARDINALITY } from './variables.js';
import { pointInShape } from './geometry.js';
import { coerceValueWithBaseType, qtiValueKey } from './values.js';

const logging = logger.getLogger(__filename);

/** Cache for compiled XSD pattern matchers, keyed by pattern string. */
const patternCache = new Map();

/**
 * Strip the 'qti-' prefix from an element's tag name.
 * @param {Element} node - DOM element
 * @returns {string} Tag name without the 'qti-' prefix, lowercased
 */
function qtiTag(node) {
  // All QTI element names start with 'qti-'; strip that 4-char prefix.
  return node.tagName.toLowerCase().slice(4);
}

/**
 * Deep equality for QTI values (primitives, flat arrays of primitives, plain record objects).
 * For positional (ordered) array comparison.
 * @param {import('./values.js').QTIValue} a - First value
 * @param {import('./values.js').QTIValue} b - Second value
 * @param {string} [baseType] - Optional QTI base type. When 'pair', uses unordered comparison.
 * @returns {boolean}
 */
function qtiValuesEqual(a, b, baseType) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    // Pair values are unordered: (A,B) === (B,A).
    // A single pair is a 2-element array of primitives (e.g. ['A','B']).
    // A container of pairs is an array of arrays (e.g. [['A','B'], ['C','D']]).
    // Only apply pair semantics when elements are primitives (not arrays).
    if (
      baseType === BASE_TYPE.PAIR &&
      a.length === 2 &&
      !Array.isArray(a[0]) &&
      !Array.isArray(b[0])
    ) {
      return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
    }
    return a.every((v, i) => qtiValuesEqual(v, b[i], baseType));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => k in b && qtiValuesEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Bag (multiset) equality for QTI multiple cardinality containers.
 * Two bags are equal if they contain the same values with the same multiplicity,
 * regardless of order: [A,B] === [B,A], but [A,A,B] !== [A,B,B].
 * @param {Array} a - First container
 * @param {Array} b - Second container
 * @param {string} [baseType] - Optional QTI base type for pair-aware comparison
 * @returns {boolean}
 */
function qtiMultisetEqual(a, b, baseType) {
  if (!Array.isArray(a) || !Array.isArray(b)) return qtiValuesEqual(a, b, baseType);
  if (a.length !== b.length) return false;

  // Build frequency maps; pair values are normalized via qtiValueKey
  const countA = new Map();
  for (const v of a) {
    const k = qtiValueKey(v, baseType);
    countA.set(k, (countA.get(k) || 0) + 1);
  }
  for (const v of b) {
    const k = qtiValueKey(v, baseType);
    const count = countA.get(k);
    if (!count) return false;
    if (count === 1) countA.delete(k);
    else countA.set(k, count - 1);
  }
  return countA.size === 0;
}

/**
 * Computes the greatest common divisor of two integers using Euclidean algorithm
 * @param {number} a - First integer
 * @param {number} b - Second integer
 * @returns {number} - The GCD of a and b
 */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Computes the least common multiple of two integers
 * @param {number} a - First integer
 * @param {number} b - Second integer
 * @returns {number} - The LCM of a and b
 */
function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a / gcd(a, b)) * Math.abs(b);
}

/**
 * Rounds a value to the given number of figures using the specified mode
 * @param {number} value - Number to round
 * @param {number} figures - Number of figures
 * @param {string} mode - 'decimalPlaces' or 'significantFigures'
 * @returns {number} - The rounded value
 */
function roundToFigures(value, figures, mode) {
  if (mode === 'decimalPlaces') {
    const factor = Math.pow(10, figures);
    return Math.round(value * factor) / factor;
  }
  // significantFigures — figures must be >= 1
  if (figures < 1) return null;
  if (value === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(value)));
  const power = figures - d;
  const magnitude = Math.pow(10, power);
  return Math.round(value * magnitude) / magnitude;
}

/**
 * Expression tags that produce container cardinality results.
 * Used by multiple/ordered to decide whether to flatten an array-valued child.
 * Everything not in this set produces single cardinality.
 */
const CONTAINER_EXPRESSION_TAGS = new Set([
  'multiple',
  'ordered',
  'delete',
  'repeat',
  'test-variables',
]);

/**
 * Determine whether a child expression node produces a container (array) result
 * rather than a single compound value (pair, point, directedPair).
 *
 * Checks declaration-backed tags first (variable, correct, default), then
 * falls back to the expression tag — the set of container-producing expressions
 * is small and known.
 * @param {Element} child - The child expression node
 * @param {object} declarations - Variable declarations
 * @returns {boolean} True if the child produces a container
 */
function childProducesContainer(child, declarations) {
  const tag = qtiTag(child);

  // Declaration-backed tags: check declared cardinality.
  // Only explicitly SINGLE cardinality is kept as a whole element;
  // MULTIPLE, ORDERED, or unknown cardinality is treated as a container.
  if (tag === 'variable' || tag === 'correct' || tag === 'default') {
    const id = child.getAttribute('identifier');
    return declarations[id]?.cardinality !== CARDINALITY.SINGLE;
  }

  // Known container-producing expression tags
  return CONTAINER_EXPRESSION_TAGS.has(tag);
}

/**
 * Gets the type of a DOM node for type checking.
 * Only handles variable and base-value nodes; compound expressions
 * (e.g. sum, product) are not type-checked.
 * @param {Element} node - The DOM node
 * @param {object} declarations - Variable declarations containing type info
 * @returns {string|null} The QTI base type, or null if not determinable
 */
function getNodeType(node, declarations) {
  const type = qtiTag(node);

  if (type === 'variable') {
    const identifier = node.getAttribute('identifier');
    const declaration = declarations[identifier];
    return declaration?.baseType || null;
  }
  if (type === 'base-value') {
    return node.getAttribute('base-type') || null;
  }
  return null;
}

/**
 * Infer the base type of an expression from its child nodes.
 * Checks children for variable/base-value/correct/default nodes
 * that carry type information via declarations. Recurses into
 * compound expression children (e.g. qti-multiple, qti-ordered,
 * qti-sum) when direct children don't carry type info.
 * @param {Element} node - The expression node
 * @param {object} declarations - Variable declarations containing type info
 * @returns {string|null} The inferred QTI base type, or null if none found
 */
function inferBaseType(node, declarations) {
  for (const child of node.children) {
    const type = getNodeType(child, declarations);
    if (type) return type;
  }
  // Recurse into children — compound expressions like qti-multiple
  // or qti-sum may wrap typed leaf nodes deeper in the tree.
  for (const child of node.children) {
    const type = inferBaseType(child, declarations);
    if (type) return type;
  }
  return null;
}

/**
 * Recursively validate an expression DOM node for type compatibility and
 * declared-variable references. Walks the tree; callers rely on this function
 * to throw rather than inspect a return value.
 * @param {Element} node - The DOM node to validate
 * @param {{[key: string]: import('./variables.js').QTIVariable}} declarations
 * Variable declarations keyed by identifier
 * @returns {void}
 * @throws {TypeError} on an unknown `qti-variable` reference or on a
 *   type-mismatched `qti-equal` child pair
 */
export function validateExpressionNode(node, declarations = {}) {
  const type = qtiTag(node);

  // Recursively validate children first
  for (const child of node.children) {
    validateExpressionNode(child, declarations);
  }

  // Type checking
  if (type === 'variable') {
    const identifier = node.getAttribute('identifier');
    if (!(identifier in declarations)) {
      throw new TypeError(`Variable '${identifier}' is not declared`);
    }
  }

  // Check type compatibility for comparison operators
  if (type === 'equal' && node.children.length === 2) {
    const leftType = getNodeType(node.children[0], declarations);
    const rightType = getNodeType(node.children[1], declarations);

    if (leftType && rightType && !areTypesCompatible(leftType, rightType)) {
      throw new TypeError(
        `Type mismatch in equal expression: ${leftType} and ${rightType} are not compatible`,
      );
    }
  }
}

/**
 * Evaluate a QTI expression DOM node against the current variable values.
 *
 * Pure function — Vue can track the read of `variables` for reactivity.
 * Output type depends on the node's QTI base type and cardinality. NULL
 * propagation is defined per-operator in the v3 Info Model section 2.11.3
 *   https://www.imsglobal.org/spec/qti/v3p0/info/#Expr3
 * Arithmetic and comparison operators return NULL for any NULL operand;
 * logical operators use three-valued logic (see qti-and at #OpAnd, qti-or
 * at #OpOr, qti-not at #OpNot within that section).
 * @param {Element} node - The DOM node to evaluate
 * @param {{[key: string]: import('./values.js').QTIValue}} variables - Current variable
 * values keyed by identifier
 * @param {{[key: string]: import('./variables.js').QTIVariable}} declarations
 * Variable declarations keyed by identifier
 * @param {object} [testStore] - Test-level outcome store for qti-test-variables
 * @returns {import('./values.js').QTIValue} A primitive, array, record object, or `null` —
 * shape depends on the node's operator and the base types involved.
 */
export function evaluateNode(node, variables, declarations = {}, testStore = null) {
  const type = qtiTag(node);
  const evalChild = child => evaluateNode(child, variables, declarations, testStore);
  const evalChildren = () => [...node.children].map(evalChild);
  const evalFirstChild = () => evalChild(node.children[0]);

  switch (type) {
    // Values - these will trigger Vue reactivity tracking
    case 'variable':
      return variables[node.getAttribute('identifier')] ?? null;
    case 'base-value':
      return coerceValueWithBaseType(node.textContent?.trim(), node.getAttribute('base-type'));
    case 'correct':
      return declarations[node.getAttribute('identifier')]?.correctResponse ?? null;
    case 'default':
      return declarations[node.getAttribute('identifier')]?.defaultValue ?? null;
    case 'null':
      return null;

    // Math operations — per v3, each operator returns NULL if any
    // sub-expression is NULL. qti-sum accepts single, multiple, or ordered
    // cardinality and flattens containers
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpSum
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpProduct
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpSubcontract    subtract
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDivide
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpPower
    case 'sum': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.length === 0 || values.some(v => v == null)) return null;
      return values.reduce((a, b) => a + b, 0);
    }
    case 'product': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.length === 0 || values.some(v => v == null)) return null;
      return values.reduce((a, b) => a * b, 1);
    }
    case 'subtract': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      return a - b;
    }
    case 'divide': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      if (b === 0) return null;
      return a / b;
    }
    case 'power': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      const result = Math.pow(a, b);
      return isFinite(result) ? result : null;
    }
    case 'min': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.some(v => v == null)) return null;
      return values.length === 0 ? null : Math.min(...values);
    }
    case 'max': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.some(v => v == null)) return null;
      return values.length === 0 ? null : Math.max(...values);
    }
    case 'round': {
      const value = evalFirstChild();
      return value == null ? null : Math.round(value);
    }
    case 'truncate': {
      const value = evalFirstChild();
      return value == null ? null : Math.trunc(value);
    }
    case 'integer-divide': {
      const [a, b] = evalChildren();
      if (a == null || b == null || b === 0) return null;
      return Math.trunc(a / b);
    }
    case 'integer-modulus': {
      const [a, b] = evalChildren();
      if (a == null || b == null || b === 0) return null;
      return a % b;
    }
    case 'integer-to-float': {
      const value = evalFirstChild();
      return value != null ? Number(value) : null;
    }
    case 'gcd': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.some(v => v == null)) return null;
      return values.length === 0 ? null : values.reduce((a, b) => gcd(a, b));
    }
    case 'lcm': {
      const values = evalChildren().flatMap(v => (Array.isArray(v) ? v : [v]));
      if (values.some(v => v == null)) return null;
      if (values.length === 0) return null;
      if (values.some(v => v === 0)) return 0;
      return values.reduce((a, b) => lcm(a, b));
    }
    case 'round-to': {
      const value = evalFirstChild();
      if (value == null) return null;
      const figuresAttr = node.getAttribute('figures');
      if (figuresAttr == null) {
        logging.warn('qti-round-to: required "figures" attribute is missing');
        return null;
      }
      const figures = parseInt(figuresAttr, 10);
      if (isNaN(figures)) {
        logging.warn(`qti-round-to: "figures" attribute is not a valid integer: "${figuresAttr}"`);
        return null;
      }
      const mode = node.getAttribute('rounding-mode') || 'significantFigures';
      return roundToFigures(value, figures, mode);
    }

    // Comparisons — each returns NULL if either operand is NULL; v3 per-op
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpEqual
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpEqualRounded
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpLT
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpLTE
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpGT
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpGTE
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDurationLT
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDurationGTE
    case 'equal': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;

      const toleranceMode = node.getAttribute('tolerance-mode') || 'exact';
      if (toleranceMode === 'exact') return a === b;

      const toleranceStr = node.getAttribute('tolerance') || '0';
      const tolerances = toleranceStr.trim().split(/\s+/).map(Number);
      const t0 = tolerances[0] || 0;
      const t1 = tolerances.length > 1 ? tolerances[1] : t0;

      const includeLowerBound = node.getAttribute('include-lower-bound') !== 'false';
      const includeUpperBound = node.getAttribute('include-upper-bound') !== 'false';

      let lower, upper;
      if (toleranceMode === 'absolute') {
        lower = a - t0;
        upper = a + t1;
      } else if (toleranceMode === 'relative') {
        // Spec formula: b in [a*(1-t0/100), a*(1+t1/100)]. For a < 0 the interval
        // inverts (lower > upper) and no b is ever in range. We preserve the literal
        // formula to match other QTI players (amp-up-io, oat-sa, qtiworks), but warn
        // so authors can spot their broken item.
        if (a < 0) {
          logging.warn(
            `qti-equal: relative tolerance with a negative first operand (${a}) produces an empty interval`,
          );
        }
        lower = a * (1 - t0 / 100);
        upper = a * (1 + t1 / 100);
      } else {
        return a === b;
      }

      const aboveLower = includeLowerBound ? b >= lower : b > lower;
      const belowUpper = includeUpperBound ? b <= upper : b < upper;
      return aboveLower && belowUpper;
    }
    case 'equal-rounded': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      const figuresAttr = node.getAttribute('figures');
      if (figuresAttr == null) {
        logging.warn('qti-equal-rounded: required "figures" attribute is missing');
        return null;
      }
      const figures = parseInt(figuresAttr, 10);
      if (isNaN(figures)) {
        logging.warn(
          `qti-equal-rounded: "figures" attribute is not a valid integer: "${figuresAttr}"`,
        );
        return null;
      }
      const mode = node.getAttribute('rounding-mode') || 'significantFigures';
      return roundToFigures(a, figures, mode) === roundToFigures(b, figures, mode);
    }
    case 'inside': {
      const shape = node.getAttribute('shape');
      const coordsStr = node.getAttribute('coords') || '';
      const coords = coordsStr ? coordsStr.split(',').map(Number) : [];
      const value = evalFirstChild();
      if (value == null) return null;
      const isContainer =
        node.children[0] && childProducesContainer(node.children[0], declarations);
      if (isContainer) {
        // qti-inside with a container: the op takes a container of points
        // and a NULL element propagates to NULL like any other NULL operand
        //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpInside
        if (value.some(v => v == null)) return null;
        return value.some(point => pointInShape(point, shape, coords));
      }
      return pointInShape(value, shape, coords);
    }
    case 'match': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      const matchBaseType = inferBaseType(node, declarations);
      if (Array.isArray(a) && Array.isArray(b)) {
        // Determine cardinality from child expressions: check declaration-based
        // tags (variable/correct/default) and expression tags that imply cardinality
        // (qti-multiple → multiple, qti-ordered → ordered).
        let cardinality = null;
        for (const child of node.children) {
          const tag = qtiTag(child);
          if (tag === 'variable' || tag === 'correct' || tag === 'default') {
            const id = child.getAttribute('identifier');
            if (id && declarations[id]?.cardinality) {
              cardinality = declarations[id].cardinality;
              break;
            }
          } else if (tag === 'multiple') {
            cardinality = CARDINALITY.MULTIPLE;
            break;
          } else if (tag === 'ordered') {
            cardinality = CARDINALITY.ORDERED;
            break;
          }
        }
        if (cardinality === null) {
          logging.warn(
            'qti-match: could not determine cardinality from child expressions; falling back to bag equality',
          );
        }
        // Single cardinality compound values (pair, directedPair, point)
        // are arrays but should use value equality, not container equality.
        if (cardinality === CARDINALITY.SINGLE) {
          return qtiValuesEqual(a, b, matchBaseType);
        }
        // Interpretation of qti-match for container cardinalities. The v3
        // spec for qti-match only says the operands must have the same
        // base-type and cardinality and "represent the same value" — it
        // does not define what "same value" means for ordered vs multiple
        // containers
        //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpMatch
        // We take the distinction made explicit for qti-contains — unordered
        // values "are compared without regard for ordering" and ordered
        // values require a strict sub-sequence
        //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpContains
        // and apply the same reasoning here: ordered uses positional
        // equality, multiple uses multiset (bag) equality.
        if (cardinality === CARDINALITY.ORDERED) {
          return qtiValuesEqual(a, b, matchBaseType);
        }
        return qtiMultisetEqual(a, b, matchBaseType);
      }
      return qtiValuesEqual(a, b, matchBaseType);
    }
    case 'lt': {
      const [a, b] = evalChildren();
      return a == null || b == null ? null : a < b;
    }
    case 'lte': {
      const [a, b] = evalChildren();
      return a == null || b == null ? null : a <= b;
    }
    case 'gt': {
      const [a, b] = evalChildren();
      return a == null || b == null ? null : a > b;
    }
    case 'gte':
    case 'duration-gte': {
      const [a, b] = evalChildren();
      return a == null || b == null ? null : a >= b;
    }
    case 'duration-lt': {
      const [a, b] = evalChildren();
      return a == null || b == null ? null : a < b;
    }

    // Logic — three-valued logic with NULL; v3 section 2.11.3
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpAnd
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpOr
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpNot
    case 'and': {
      const values = evalChildren();
      if (values.some(v => v === false)) return false;
      if (values.some(v => v == null)) return null;
      return true;
    }
    case 'or': {
      const values = evalChildren();
      if (values.some(v => v === true)) return true;
      if (values.some(v => v == null)) return null;
      return false;
    }
    case 'not': {
      const value = evalFirstChild();
      return value == null ? null : !value;
    }
    case 'any-n': {
      const parsedMin = parseInt(node.getAttribute('min'), 10);
      const min = isNaN(parsedMin) ? 0 : parsedMin;
      const parsedMax = parseInt(node.getAttribute('max'), 10);
      const max = isNaN(parsedMax) ? Infinity : parsedMax;
      const children = evalChildren();
      let trueCount = 0;
      let nullCount = 0;
      for (const child of children) {
        if (child == null) nullCount++;
        else if (child) trueCount++;
      }
      if (trueCount > max) return false;
      if (trueCount + nullCount < min) return false;
      // Three-valued logic for qti-any-n
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpAnyN
      // The spec defines the FALSE conditions: more than max true, or more
      // than n-min false — the latter is equivalent to
      // trueCount+nullCount < min. When neither FALSE condition is satisfied
      // and one or more sub-expressions are NULL, the result is NULL. We
      // return TRUE only when the min threshold is definitely met AND the
      // max threshold cannot be exceeded even if every null resolves to
      // true; any indeterminate case falls through to NULL.
      if (trueCount >= min && trueCount + nullCount <= max) return true;
      return null;
    }

    // Utilities
    case 'is-null': {
      const isNullVal = evalFirstChild();
      // qti-is-null: "empty containers and empty strings are both treated
      // as NULL"
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
      return isNullVal == null || (Array.isArray(isNullVal) && isNullVal.length === 0);
    }
    case 'member': {
      const [value, set] = evalChildren();
      if (value == null || set == null) return null;
      const memberBaseType = inferBaseType(node, declarations);
      return Array.isArray(set)
        ? set.some(item => qtiValuesEqual(item, value, memberBaseType))
        : qtiValuesEqual(value, set, memberBaseType);
    }
    case 'contains': {
      const [container, sub] = evalChildren();
      if (container == null || sub == null) return null;
      if (!Array.isArray(container)) return false;
      // qti-contains takes two same-base-type containers and tests
      // subset/multiset containment (unordered) or strict sub-sequence
      // (ordered)
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpContains
      if (!Array.isArray(sub)) {
        const containsBaseType = inferBaseType(node, declarations);
        return container.some(item => qtiValuesEqual(item, sub, containsBaseType));
      }
      // Determine whether sub is a single compound value (pair/point) or a
      // sub-container. Resolution order:
      // 1. Declaration cardinality (authoritative when available)
      // 2. Expression tag (multiple/ordered/delete/repeat imply container)
      // 3. Container element type heuristic (if container holds arrays, sub
      //    is likely a single compound value — safe because an empty container
      //    falls through to multiset containment, which correctly returns
      //    false for any non-empty sub)
      let subCardinality = null;
      if (node.children.length >= 2) {
        const subChild = node.children[1];
        const tag = qtiTag(subChild);
        if (tag === 'variable' || tag === 'correct' || tag === 'default') {
          const id = subChild.getAttribute('identifier');
          subCardinality = declarations[id]?.cardinality ?? null;
        } else if (
          tag === 'multiple' ||
          tag === 'ordered' ||
          tag === 'delete' ||
          tag === 'repeat'
        ) {
          subCardinality =
            tag === 'ordered' || tag === 'repeat' ? CARDINALITY.ORDERED : CARDINALITY.MULTIPLE;
        }
      }
      if (subCardinality === null && Array.isArray(sub)) {
        logging.warn(
          'qti-contains: could not determine cardinality of second operand from declarations or expression tag; falling back to element-type heuristic',
        );
      }
      const subIsSingleValue =
        subCardinality === CARDINALITY.SINGLE ||
        (subCardinality === null && container.length > 0 && Array.isArray(container[0]));
      if (subIsSingleValue) {
        const containsBaseType = inferBaseType(node, declarations);
        return container.some(item => qtiValuesEqual(item, sub, containsBaseType));
      }
      // Multiset containment: every value in sub must be present in
      // container with at least the same multiplicity.
      const containsBaseType = inferBaseType(node, declarations);
      const counts = new Map();
      for (const v of container) {
        const k = qtiValueKey(v, containsBaseType);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      for (const v of sub) {
        const k = qtiValueKey(v, containsBaseType);
        const count = counts.get(k);
        if (!count) return false;
        counts.set(k, count - 1);
      }
      return true;
    }
    case 'container-size': {
      const val = evalFirstChild();
      if (val == null) return 0;
      if (!Array.isArray(val)) return 1;
      // Single compound values (pair, point, directedPair) are arrays but
      // represent one value, not a container. Use childProducesContainer to
      // distinguish them from actual containers (multiple/ordered).
      if (node.children[0] && !childProducesContainer(node.children[0], declarations)) return 1;
      return val.length;
    }
    case 'string-match': {
      const [a, b] = evalChildren();
      if (a == null || b == null) return null;
      const sa = String(a);
      const sb = String(b);
      return node.getAttribute('case-sensitive') === 'false'
        ? sa.toLowerCase() === sb.toLowerCase()
        : sa === sb;
    }
    case 'pattern-match': {
      const value = evalFirstChild();
      if (value == null) return null;
      const pattern = node.getAttribute('pattern');
      if (pattern == null) return null;
      let matcher = patternCache.get(pattern);
      if (!matcher) {
        // The qti-pattern-match "pattern" characteristic requires XML
        // Schema regex syntax — "as defined in Appendix F of [XSCHEMA, 01]"
        // per v3 section 5.104.1
        //   https://www.imsglobal.org/spec/qti/v3p0/info/#DataCharacteristic_PatternMatch.Attr_pattern
        // XSD regex differs from JS regex: implicit full-string anchoring,
        // no backreferences/lookahead, and XSD-specific features (\i, \c,
        // Unicode categories, character class subtraction). We use the
        // xspattern library instead of converting to JS RegExp — this gives
        // us full spec compliance and eliminates ReDoS risk. The pattern
        // attribute comes from QTI content which may be authored by third
        // parties; JS RegExp's backtracking engine is vulnerable to
        // catastrophic backtracking on patterns with nested quantifiers
        // (e.g. (a+)+), whereas xspattern uses its own non-backtracking
        // matching engine.
        try {
          matcher = compileXsdPattern(pattern);
        } catch (e) {
          return null;
        }
        patternCache.set(pattern, matcher);
      }
      return matcher(String(value));
    }
    case 'substring': {
      const [sub, str] = evalChildren();
      if (sub == null || str == null) return null;
      const sa = String(sub);
      const sb = String(str);
      return node.getAttribute('case-sensitive') === 'false'
        ? sb.toLowerCase().includes(sa.toLowerCase())
        : sb.includes(sa);
    }

    // Mapping operators
    case 'map-response':
    case 'map-response-point': {
      const identifier = node.getAttribute('identifier');
      const decl = declarations[identifier];
      const result = decl?.score(variables[identifier]);
      if (result == null) {
        logging.warn(`qti-${type}: declaration '${identifier}' has no mapping/area-mapping`);
        return null;
      }
      return result;
    }

    // Random operators
    case 'random-integer': {
      const minAttr = node.getAttribute('min');
      const maxAttr = node.getAttribute('max');
      const stepAttr = node.getAttribute('step');
      // qti-random-integer requires "max" — multiplicity [1] per v3 7.34.2
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Derived_RandomInteger
      if (maxAttr == null) return null;
      const min = minAttr != null ? parseInt(minAttr, 10) : 0;
      const max = parseInt(maxAttr, 10);
      if (min > max) return null;
      const parsedStep = stepAttr != null ? parseInt(stepAttr, 10) : 1;
      const step = isNaN(parsedStep) ? 1 : parsedStep;
      if (step <= 0) return null;
      const range = Math.floor((max - min) / step) + 1;
      return min + Math.floor(Math.random() * range) * step;
    }
    case 'random-float': {
      const minFAttr = node.getAttribute('min');
      const maxFAttr = node.getAttribute('max');
      // qti-random-float requires "max" — multiplicity [1] per v3 7.33.2
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Derived_RandomFloat
      if (maxFAttr == null) return null;
      const min = minFAttr != null ? parseFloat(minFAttr) : 0;
      const max = parseFloat(maxFAttr);
      if (min > max) return null;
      return min + Math.random() * (max - min);
    }
    case 'random': {
      const container = evalFirstChild();
      if (!Array.isArray(container) || container.length === 0) return null;
      return container[Math.floor(Math.random() * container.length)];
    }

    // Math constants
    case 'math-constant': {
      const name = node.getAttribute('name');
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      return null;
    }

    // Stats operator - calculates statistical measures on a container of numeric values
    case 'stats-operator': {
      const name = node.getAttribute('name');
      const container = evalFirstChild();
      if (!Array.isArray(container) || container.length === 0) return null;
      if (container.some(v => v == null)) return null;

      const n = container.length;
      const sum = container.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      if (name === 'mean') return mean;

      const sumSquareDiffs = container.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0);
      if (name === 'popVariance') return sumSquareDiffs / n;
      if (name === 'popSD') return Math.sqrt(sumSquareDiffs / n);
      if (name === 'sampleVariance') return n > 1 ? sumSquareDiffs / (n - 1) : null;
      if (name === 'sampleSD') return n > 1 ? Math.sqrt(sumSquareDiffs / (n - 1)) : null;
      return null;
    }

    // Container operators
    case 'index': {
      const n = parseInt(node.getAttribute('n'), 10);
      const container = evalFirstChild();
      if (!Array.isArray(container) || isNaN(n) || n <= 0 || n > container.length) return null;
      return container[n - 1] ?? null;
    }
    case 'delete': {
      const [container, ...toDelete] = evalChildren();
      if (!Array.isArray(container)) return null;
      // qti-delete returns NULL if either sub-expression is NULL
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpDelete
      if (toDelete.some(d => d == null)) return null;
      const deleteBaseType = inferBaseType(node, declarations);
      return container.filter(item => !toDelete.some(d => qtiValuesEqual(item, d, deleteBaseType)));
    }
    // qti-multiple / qti-ordered: each accepts 0+ sub-expressions of single
    // or multiple (or for ordered, single or ordered) cardinality
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpMultiple
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpOrdered
    // Containers are flattened; single compound values (pair, point,
    // directedPair) are added as whole elements. We detect containers by
    // checking declared cardinality or expression tag — the set of
    // container-producing expressions is small and known (multiple,
    // ordered, delete, repeat), so we treat everything else as single
    // cardinality.
    case 'multiple':
    case 'ordered': {
      const results = [];
      for (const child of node.children) {
        const childValue = evalChild(child);
        if (childValue == null) continue;
        if (!Array.isArray(childValue)) {
          results.push(childValue);
          continue;
        }
        if (childProducesContainer(child, declarations)) {
          results.push(...childValue);
        } else {
          // Single compound value (pair, point, directedPair) — add as one element
          results.push(childValue);
        }
      }
      return results;
    }
    case 'field-value': {
      const record = evalFirstChild();
      if (record == null || typeof record !== 'object' || Array.isArray(record)) return null;
      return record[node.getAttribute('field-identifier')] ?? null;
    }
    case 'repeat': {
      const iterations = parseInt(node.getAttribute('number-of-iterations'), 10) || 0;
      const results = [];
      for (let i = 0; i < iterations; i++) {
        for (const child of node.children) {
          const childValue = evalChild(child);
          // Exclude NULLs, consistent with ordered/multiple container construction
          if (childValue == null) continue;
          // Flatten container sub-expressions, consistent with ordered/multiple.
          // Single compound values (pair, point, directedPair) are kept whole.
          if (Array.isArray(childValue) && childProducesContainer(child, declarations)) {
            results.push(...childValue);
          } else {
            results.push(childValue);
          }
        }
      }
      return results;
    }

    // Math operators - trigonometric, hyperbolic, and other mathematical functions
    case 'math-operator':
      return evaluateMathOperator(node, evalChildren, evalFirstChild);

    // Test-level expression - aggregates outcome variables across items
    case 'test-variables':
      return evaluateTestVariables(node, testStore);

    default:
      logging.warn(`Unrecognized QTI expression element: qti-${type}`);
      return null;
  }
}

/**
 * Evaluates math-operator expressions (trigonometric, hyperbolic, etc.)
 * @param {Element} node - The qti-math-operator element
 * @param {() => number[]} evalChildren - Evaluates all child expressions
 * @param {() => number} evalFirstChild - Evaluates the first child expression
 * @returns {number|null} The computed result, or null on null/out-of-domain input
 */
function evaluateMathOperator(node, evalChildren, evalFirstChild) {
  const name = node.getAttribute('name');

  // atan2 is the only binary math operator
  if (name === 'atan2') {
    const [first, second] = evalChildren();
    if (first == null || second == null) return null;
    return Math.atan2(first, second);
  }

  const first = evalFirstChild();
  if (first == null) return null;

  switch (name) {
    case 'sin':
      return Math.sin(first);
    case 'cos':
      return Math.cos(first);
    case 'tan':
      return Math.tan(first);
    case 'asin':
      return Math.abs(first) > 1 ? null : Math.asin(first);
    case 'acos':
      return Math.abs(first) > 1 ? null : Math.acos(first);
    case 'atan':
      return Math.atan(first);
    case 'sinh':
      return Math.sinh(first);
    case 'cosh':
      return Math.cosh(first);
    case 'tanh':
      return Math.tanh(first);
    case 'coth': {
      const t = Math.tanh(first);
      return t === 0 ? null : 1 / t;
    }
    case 'sech':
      return 1 / Math.cosh(first);
    case 'csch': {
      const s = Math.sinh(first);
      return s === 0 ? null : 1 / s;
    }
    case 'abs':
      return Math.abs(first);
    case 'exp':
      return Math.exp(first);
    case 'ln':
      return first <= 0 ? null : Math.log(first);
    case 'log':
      return first <= 0 ? null : Math.log10(first);
    case 'sqrt':
      return first < 0 ? null : Math.sqrt(first);
    case 'floor':
      return Math.floor(first);
    case 'ceil':
      return Math.ceil(first);
    case 'signum':
      return Math.sign(first);
    case 'toDegrees':
      return (first * 180) / Math.PI;
    case 'toRadians':
      return (first * Math.PI) / 180;
    case 'cot': {
      const tn = Math.tan(first);
      return tn === 0 ? null : 1 / tn;
    }
    case 'sec': {
      const cs = Math.cos(first);
      return cs === 0 ? null : 1 / cs;
    }
    case 'csc': {
      const sn = Math.sin(first);
      return sn === 0 ? null : 1 / sn;
    }
    case 'acot':
      return Math.PI / 2 - Math.atan(first);
    case 'asec':
      return Math.abs(first) < 1 ? null : Math.acos(1 / first);
    case 'acsc':
      return Math.abs(first) < 1 ? null : Math.asin(1 / first);
    default:
      return null;
  }
}

/**
 * Checks whether a test item matches the filtering criteria for test-variables aggregation.
 * @param {string} id - The item identifier
 * @param {object} item - The item data from the test store
 * @param {object} filters - Parsed filter criteria
 * @param {string|null} filters.itemIdentifier - Specific item to match, or null for all
 * @param {string|null} filters.sectionIdentifier - Section to match, or null for all
 * @param {string[]|null} filters.includeCategories - Categories to include (any match), or null
 * @param {string[]|null} filters.excludeCategories - Categories to exclude (any match), or null
 * @param {string} filters.varName - The outcome variable name to aggregate
 * @param {string|null} filters.baseType - Required base type, or null for numeric types
 * @returns {boolean} True if the item matches all filters
 */
function matchesTestVariableFilters(id, item, filters) {
  if (filters.itemIdentifier && id !== filters.itemIdentifier) return false;
  if (filters.sectionIdentifier && item.section !== filters.sectionIdentifier) return false;

  if (filters.includeCategories || filters.excludeCategories) {
    const categories = item.category?.split(' ') || [];
    if (filters.includeCategories && !filters.includeCategories.some(c => categories.includes(c)))
      return false;
    if (filters.excludeCategories && filters.excludeCategories.some(c => categories.includes(c)))
      return false;
  }

  if (item.outcomes?.[filters.varName] === undefined || item.outcomes?.[filters.varName] === null)
    return false;

  const cardinality = item.cardinalities?.[filters.varName] || CARDINALITY.SINGLE;
  if (cardinality !== CARDINALITY.SINGLE) return false;

  const varBaseType = item.baseTypes?.[filters.varName];
  if (filters.baseType) {
    if (varBaseType !== filters.baseType) return false;
  } else {
    if (varBaseType !== BASE_TYPE.INTEGER && varBaseType !== BASE_TYPE.FLOAT) return false;
  }

  return true;
}

/**
 * Evaluates test-variables expression — aggregates outcome variables across items
 * that match the specified filters (section, category, base type).
 * @param {Element} node - The qti-test-variables XML element
 * @param {object} testStore - Test store containing item outcome data
 * @returns {Array<number>} Array of aggregated values
 */
function evaluateTestVariables(node, testStore) {
  if (!testStore?.items) return [];

  const variableIdentifier = node.getAttribute('variable-identifier');
  const includeCategoryAttr = node.getAttribute('include-category');
  const excludeCategoryAttr = node.getAttribute('exclude-category');
  const weightIdentifier = node.getAttribute('weight-identifier');

  // Parse dotted variable-identifier (e.g., "ITEM1.SCORE")
  let itemIdentifier = null;
  let varName = variableIdentifier;
  if (variableIdentifier?.includes('.')) {
    const parts = variableIdentifier.split('.');
    itemIdentifier = parts[0];
    varName = parts[1];
  }

  const filters = {
    itemIdentifier,
    sectionIdentifier: node.getAttribute('section-identifier'),
    includeCategories: includeCategoryAttr ? includeCategoryAttr.split(/\s+/) : null,
    excludeCategories: excludeCategoryAttr ? excludeCategoryAttr.split(/\s+/) : null,
    varName,
    baseType: node.getAttribute('base-type'),
  };

  const results = [];

  for (const [id, item] of Object.entries(testStore.items)) {
    if (!matchesTestVariableFilters(id, item, filters)) continue;

    let value = item.outcomes[varName];

    if (weightIdentifier) {
      const weight = item.weights?.[weightIdentifier] ?? 1.0;
      value = value * weight;
    }

    results.push(value);
  }

  return results;
}
