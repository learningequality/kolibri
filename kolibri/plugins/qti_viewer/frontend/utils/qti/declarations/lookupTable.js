/**
 * LookupTable declaration strategy.
 * Parses a qti-interpolation-table or qti-match-table XML element
 * and registers a lookup capability on the parent QTIVariable.
 */
import { coerceValueWithBaseType } from '../values.js';
import { CAPABILITY } from './capabilities.js';

/** @typedef {import('../values.js').QTIValue} QTIValue */

/**
 * Declaration strategy that parses an interpolation or match table element
 * and provides a lookup capability for outcome value resolution.
 */
export default class LookupTable {
  /**
   * Parses the table element into sorted entries and registers the lookup capability.
   * @param {Element} xmlNode - The qti-interpolation-table or qti-match-table XML element
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    const tagName = xmlNode.tagName.toLowerCase();

    /** @type {'interpolation'|'match'} */
    this.tableType = tagName === 'qti-interpolation-table' ? 'interpolation' : 'match';

    /** @type {QTIValue} */
    this.defaultValue = xmlNode.hasAttribute('default-value')
      ? coerceValueWithBaseType(xmlNode.getAttribute('default-value'), variable.baseType)
      : null;

    /** @type {Array<{sourceValue: number, targetValue: QTIValue, includeBoundary?: boolean}>} */
    this.entries = [];

    if (this.tableType === 'interpolation') {
      for (const entry of xmlNode.querySelectorAll('qti-interpolation-table-entry')) {
        this.entries.push({
          sourceValue: parseFloat(entry.getAttribute('source-value')),
          targetValue: coerceValueWithBaseType(
            entry.getAttribute('target-value'),
            variable.baseType,
          ),
          includeBoundary: entry.getAttribute('include-boundary') !== 'false',
        });
      }
    } else {
      // MatchTable "transforms a source integer by finding the first
      // qti-match-table-entry with an exact match to the source" — v3
      // section 5.90
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#Data_MatchTable
      for (const entry of xmlNode.querySelectorAll('qti-match-table-entry')) {
        this.entries.push({
          sourceValue: parseInt(entry.getAttribute('source-value'), 10),
          targetValue: coerceValueWithBaseType(
            entry.getAttribute('target-value'),
            variable.baseType,
          ),
        });
      }
    }

    // Sort interpolation entries once at construction time
    if (this.tableType === 'interpolation') {
      this.entries.sort((a, b) => a.sourceValue - b.sourceValue);
    }

    variable.registerCapability(CAPABILITY.LOOKUP, value => this.lookup(value));
  }

  /**
   * Look up a value in the table.
   * For interpolation tables, entries are sorted by sourceValue ascending and
   * the first entry whose sourceValue is greater than the input (or equal to it
   * when includeBoundary is true) provides the target. For match tables, an exact
   * sourceValue match is required.
   * @param {number|null} value - The value to look up
   * @returns {QTIValue} The target value from the table, or the default
   */
  lookup(value) {
    if (value == null) {
      return this.defaultValue;
    }

    if (this.tableType === 'interpolation') {
      for (const entry of this.entries) {
        const includeBoundary = entry.includeBoundary !== false;

        if (value < entry.sourceValue || (includeBoundary && value === entry.sourceValue)) {
          return entry.targetValue;
        }
      }

      // No match found, return default
      return this.defaultValue;
    }

    // Match table: find exact match
    for (const entry of this.entries) {
      if (entry.sourceValue === value) {
        return entry.targetValue;
      }
    }

    return this.defaultValue;
  }

  /**
   * Process a qti-lookup-outcome-value response rule.
   * Evaluates the child expression, looks up the result in the declaration's
   * lookup table, and sets the outcome variable.
   * @param {Element} ruleNode - The qti-lookup-outcome-value element
   * @param {object} combinedVars - Combined response + outcome variables (mutated)
   * @param {object} declarations - Variable declarations keyed by identifier
   * @param {Function} evaluateNode - Expression evaluator function,
   * injected to avoid circular imports
   */
  static processRule(ruleNode, combinedVars, declarations, evaluateNode) {
    const identifier = ruleNode.getAttribute('identifier');

    if (ruleNode.children.length === 0) {
      return;
    }

    const declaration = declarations[identifier];
    // lookup() is provided by the LOOKUP capability registered on the variable
    if (!declaration || typeof declaration.lookup !== 'function') {
      return;
    }

    const value = evaluateNode(ruleNode.children[0], combinedVars, declarations);
    const targetValue = declaration.lookup(value);
    combinedVars[identifier] = targetValue;
  }
}
