/**
 * QTI Variable Declaration System
 *
 * Handles parsing and validation of QTI variable declarations.
 * Uses a capability registration pattern where declaration strategy
 * classes (from declarations/index.js) register capabilities on
 * the variable during construction.
 * @module variables
 */
import { ref } from 'vue';
import { BASE_TYPE } from '../../constants';
import { coerceValueWithBaseType } from './values';
import { declarationParsers } from './declarations/index.js';
import { CAPABILITY } from './declarations/capabilities.js';

/** @typedef {import('./values.js').QTIValue} QTIValue */

/** @enum {string} */
export const CARDINALITY = {
  SINGLE: 'single',
  MULTIPLE: 'multiple',
  ORDERED: 'ordered',
  RECORD: 'record',
};

/**
 * Parse field declarations for record cardinality variables.
 * Scans qti-value elements inside qti-default-value and qti-correct-response
 * to discover field identifiers and their base types.
 * @param {Element} xmlNode - The variable declaration XML element
 * @returns {{[key: string]: QTIVariable}|null} Map of field identifiers to
 * QTIVariable instances, or null if no fields are found
 */
function parseFieldDeclarations(xmlNode) {
  const declarations = {};
  const valueNodes = xmlNode.querySelectorAll(
    'qti-default-value qti-value, qti-correct-response qti-value',
  );

  for (const valueNode of valueNodes) {
    const fieldId = valueNode.getAttribute('field-identifier');
    const baseType = valueNode.getAttribute('base-type');

    if (fieldId && baseType && !declarations[fieldId]) {
      declarations[fieldId] = new QTIVariable(valueNode);
    }
  }

  return Object.keys(declarations).length > 0 ? declarations : null;
}

// Base types whose single-cardinality values are represented as 2-element arrays
// (e.g., pair ["A","B"], point [100,200]). Distinguished from container arrays
// (multiple/ordered cardinality) which hold N elements.
const COMPOUND_VALUE_TYPES = new Set([BASE_TYPE.DIRECTED_PAIR, BASE_TYPE.PAIR, BASE_TYPE.POINT]);

/**
 * Represents a QTI variable declaration with reactive state and
 * capability-based access to parsed child elements.
 *
 * Declaration strategy classes (DefaultValue, CorrectResponse, Mapping,
 * AreaMapping, LookupTable) register capabilities during construction
 * by iterating the XML node's children and looking them up in the
 * declarationParsers registry.
 * @property {string} identifier - The declared identifier (or field-identifier
 * for record fields).
 * @property {string} baseType - QTI base type attribute (e.g. `integer`,
 * `identifier`, `point`). May be `null` on variables that don't declare one.
 * @property {string} cardinality - `single`, `multiple`, `ordered`, or `record`.
 * @property {{[key: string]: QTIVariable}|null} fieldDeclarations - For record
 * cardinality, a map of field identifier to its declared QTIVariable;
 * `null` for non-record variables.
 * @property {QTIValue} value - Current reactive value; writing coerces via
 * {@link QTIVariable#coerceValue}. Type depends on baseType and cardinality.
 * @property {QTIValue} defaultValue - Parsed default from `<qti-default-value>`, or
 * `null` if no default-value capability was registered.
 * @property {QTIValue} correctResponse - Parsed correct response from
 * `<qti-correct-response>`, or `null` if no correct-response was registered.
 */
export class QTIVariable {
  /**
   * Parses the declaration, letting child elements register their capabilities.
   * @param {Element} xmlNode - The XML declaration element to parse
   * @param {Function} [valueSetCallback] - Optional callback invoked when the value changes
   */
  constructor(xmlNode, valueSetCallback) {
    // Handle both declaration nodes and value nodes (for field declarations)
    this.identifier =
      xmlNode.getAttribute('identifier') || xmlNode.getAttribute('field-identifier');
    this.baseType = xmlNode.getAttribute('base-type');
    this.cardinality = xmlNode.getAttribute('cardinality') || CARDINALITY.SINGLE;

    // Parse field declarations for record cardinality
    this.fieldDeclarations =
      this.cardinality === CARDINALITY.RECORD ? parseFieldDeclarations(xmlNode) : null;

    /** @type {{[key: string]: Function}} */
    this._capabilities = {};

    // Iterate child elements and delegate to registered declaration parsers.
    // Each constructor registers capabilities on this variable as a side effect.
    for (const child of xmlNode.children) {
      const Declaration = declarationParsers[child.tagName.toLowerCase()];
      if (Declaration) {
        new Declaration(child, this);
      }
    }

    // Initialize reactive value AFTER child iteration so DefaultValue
    // capability is registered before this line reads this.defaultValue
    this._value = ref(this.defaultValue);
    this._valueSetCallback = typeof valueSetCallback === 'function' ? valueSetCallback : () => {};
  }

  /**
   * Register a named capability on this variable.
   * Called by declaration strategy classes during their construction.
   * @param {string} name - The capability name (e.g. 'defaultValue', 'score', 'lookup')
   * @param {Function} fn - The capability function
   */
  registerCapability(name, fn) {
    this._capabilities[name] = fn;
  }

  /**
   * The default value for this variable, or null if no qti-default-value
   * child was present.
   * @type {QTIValue}
   */
  get defaultValue() {
    return this._capabilities[CAPABILITY.DEFAULT_VALUE]?.() ?? null;
  }

  /**
   * The correct response for this variable, or null if no qti-correct-response
   * child was present.
   * @type {QTIValue}
   */
  get correctResponse() {
    return this._capabilities[CAPABILITY.CORRECT_RESPONSE]?.() ?? null;
  }

  /**
   * Compute a score by applying the variable's mapping to a response value.
   * Returns null if no mapping capability is registered.
   * @param {QTIValue} responseValue - The response value to score
   * @returns {number|null} The computed score, or null
   */
  score(responseValue) {
    return this._capabilities[CAPABILITY.SCORE]?.(responseValue) ?? null;
  }

  /**
   * Look up a value in the variable's lookup table (interpolation or match).
   * Returns null if no lookup capability is registered.
   * @param {QTIValue} value - The value to look up
   * @returns {QTIValue} The target value from the table, or null
   */
  lookup(value) {
    return this._capabilities[CAPABILITY.LOOKUP]?.(value) ?? null;
  }

  /**
   * The current reactive value, coerced to this variable's base type and cardinality.
   * @type {QTIValue}
   */
  get value() {
    return this._value.value;
  }

  set value(newValue) {
    this._value.value = this.coerceValue(newValue);
    this._valueSetCallback();
  }

  /** Reset the variable's value to its default. */
  reset() {
    this._value.value = this.defaultValue;
  }

  /**
   * Parse qti-value children from a container node, coercing to the
   * variable's base type and cardinality.
   * @param {Element} node - The container element (e.g. qti-default-value)
   * @returns {QTIValue} The parsed and coerced value(s)
   */
  parseValues(node) {
    if (this.cardinality === CARDINALITY.RECORD) {
      return this.parseRecordValues(node);
    }

    const textValues = [...node.querySelectorAll('qti-value')].map(v => v.textContent.trim());

    return this.coerceValue(textValues);
  }

  /**
   * Parse record-cardinality values from a container node, using field
   * declarations to coerce each field independently.
   * @param {Element} node - The container element
   * @returns {object} The parsed record object
   */
  parseRecordValues(node) {
    const recordObject = {};

    if (this.fieldDeclarations) {
      for (const [fieldId, fieldDeclaration] of Object.entries(this.fieldDeclarations)) {
        const fieldValueNodes = [
          ...node.querySelectorAll(`qti-value[field-identifier="${fieldId}"]`),
        ];
        const values = fieldValueNodes.map(valueNode => valueNode.textContent.trim());

        if (values.length > 0) {
          recordObject[fieldId] = fieldDeclaration.coerceValue(values);
        }
      }
    }

    return recordObject;
  }

  /**
   * Coerce a value to match this variable's base type and cardinality.
   * Handles null/undefined, single values, arrays, and record objects.
   * @param {QTIValue} values - The value(s) to coerce
   * @returns {QTIValue} The coerced value
   * @throws {TypeError} If the value cannot be coerced
   */
  coerceValue(values) {
    // Handle null/undefined cases. Empty containers and empty strings are
    // both treated as NULL in QTI — see qti-is-null
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
    // For string-like base types we preserve the empty string here and
    // defer the NULL decision to coerceValueWithBaseType per-element; for
    // containers, each element is coerced individually.
    if (values === null || values === undefined || values === 'NULL') {
      return null;
    }

    if (this.cardinality === CARDINALITY.SINGLE) {
      if (Array.isArray(values)) {
        if (values.length === 0) {
          return null;
        }
        // pair, point, and directedPair types accept 2-element arrays as single values.
        // For non-array types: reject 2+ elements. For array types: reject 3+ elements.
        if ((!COMPOUND_VALUE_TYPES.has(this.baseType) && values.length > 1) || values.length > 2) {
          throw new TypeError('Multiple values passed to single cardinality');
        } else if (values.length === 1) {
          values = values[0];
        }
      }
      return coerceValueWithBaseType(values, this.baseType);
    } else if (this.cardinality === CARDINALITY.RECORD) {
      // For record cardinality, values should be a JavaScript object
      if (values == null || typeof values !== 'object' || Array.isArray(values)) {
        throw new TypeError('Record cardinality requires a JavaScript object');
      }

      // A record with no declared field schema is schemaless: its fields and
      // their base types are supplied at runtime (e.g. a custom interaction
      // writing correct/simpleAnswer/answerState), so store them as-is. A record
      // that does declare a schema coerces each declared field and rejects
      // unknown ones.
      const result = {};
      for (const [key, value] of Object.entries(values)) {
        if (!this.fieldDeclarations) {
          result[key] = value;
          continue;
        }
        const fieldDeclaration = this.fieldDeclarations[key];
        if (!fieldDeclaration) {
          throw new TypeError(`Field '${key}' is not defined in record declaration`);
        }
        result[key] = fieldDeclaration.coerceValue(value);
      }
      return result;
    } else {
      // Multiple or ordered cardinality — wrap scalars so callers
      // don't crash when an expression produces a single value for
      // a container-cardinality variable.
      const arr = Array.isArray(values) ? values : [values];
      return arr.map(v => coerceValueWithBaseType(v, this.baseType));
    }
  }
}

const numeric = new Set([BASE_TYPE.INTEGER, BASE_TYPE.FLOAT]);

/**
 * Check whether two QTI base types are compatible.
 * Types are compatible if they are the same, or both numeric.
 * @param {string} typeA - First base type
 * @param {string} typeB - Second base type
 * @returns {boolean} True if the types are compatible
 */
export function areTypesCompatible(typeA, typeB) {
  if (typeA === typeB) {
    return true;
  }

  // Numeric types are compatible
  if (numeric.has(typeA) && numeric.has(typeB)) {
    return true;
  }

  return false;
}
