/**
 * Mapping declaration strategy.
 * Parses a qti-mapping XML element and provides a score capability
 * based on map-key to mapped-value entries.
 * @module declarations/mapping
 */
import { BASE_TYPE } from '../../../constants';
import ScoringDeclaration from './scoringDeclaration.js';

/** @typedef {import('../values.js').QTIValue} QTIValue */

/**
 * Declaration strategy that scores responses by looking up each response
 * value in a key-to-score mapping table.
 * @augments ScoringDeclaration
 */
export default class Mapping extends ScoringDeclaration {
  /**
   * Parses map entries (exact and case-insensitive) from the mapping element.
   * @param {Element} xmlNode - The qti-mapping XML element
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    super(xmlNode, variable);

    /** @type {string} The QTI base type of the parent variable */
    this.baseType = variable.baseType;

    /** @type {string} The cardinality of the parent variable */
    this.cardinality = variable.cardinality;

    /** @type {Map<string, number>} Case-sensitive entries keyed by exact map-key */
    this.exactEntries = new Map();

    /** @type {Array<{key: string, value: number}>} Case-insensitive entries with lowercased keys */
    this.ciEntries = [];

    for (const entry of xmlNode.querySelectorAll('qti-map-entry')) {
      const mapKey = entry.getAttribute('map-key');
      const mappedValue = parseFloat(entry.getAttribute('mapped-value'));
      if (entry.getAttribute('case-sensitive') !== 'true') {
        this.ciEntries.push({
          key: this._normalizeMapKey(mapKey.toLowerCase()),
          value: mappedValue,
        });
      } else {
        // For pair baseType, normalize map-key order so (B,A) matches (A,B)
        const normalizedKey = this._normalizeMapKey(mapKey);
        this.exactEntries.set(normalizedKey, mappedValue);
      }
    }
  }

  /**
   * Normalize a map-key string for compound base types (pair, directedPair, point).
   * QTI map-key values use space-separated format (e.g., "A B"), matching
   * the QTI value representation. For pair baseType, additionally sorts
   * elements so "B A" is stored as "A B" (pairs are unordered).
   * @param {string} mapKey - The raw map-key from XML
   * @returns {string} The normalized key
   */
  _normalizeMapKey(mapKey) {
    if (this.baseType === BASE_TYPE.PAIR) {
      const parts = mapKey.split(/[\s,]+/);
      if (parts.length === 2) {
        return parts[0] <= parts[1] ? `${parts[0]} ${parts[1]}` : `${parts[1]} ${parts[0]}`;
      }
    }
    return mapKey;
  }

  /**
   * Build a lookup key from a response value.
   * For compound types (pair, directedPair, point), produces a space-separated
   * string to match the QTI value format used in map-key attributes.
   * For pair baseType, normalizes order so ['B','A'] produces the same key as "A B".
   * @param {QTIValue} v - The response value
   * @returns {string} The normalized key string
   */
  _key(v) {
    if (Array.isArray(v) && v.length === 2) {
      if (this.baseType === BASE_TYPE.PAIR) {
        return v[0] <= v[1] ? `${v[0]} ${v[1]}` : `${v[1]} ${v[0]}`;
      }
      if (this.baseType === BASE_TYPE.DIRECTED_PAIR || this.baseType === BASE_TYPE.POINT) {
        return `${v[0]} ${v[1]}`;
      }
    }
    return String(v);
  }

  /**
   * Look up a single response value against all entries.
   * Checks exact (case-sensitive) entries first, then case-insensitive entries.
   * @param {string} key - The normalized response value key
   * @returns {number|undefined} The mapped value, or undefined if no match
   */
  _lookup(key) {
    const exact = this.exactEntries.get(key);
    if (exact !== undefined) return exact;
    if (this.ciEntries.length > 0) {
      const lower = key.toLowerCase();
      const ci = this.ciEntries.find(e => e.key === lower);
      if (ci) return ci.value;
    }
    return undefined;
  }

  /**
   * Compute a score by applying the mapping to a response value.
   * For array values (multiple/ordered cardinality), duplicates are
   * counted only once. The result is clamped to any configured bounds.
   * @param {QTIValue} value - The response value (single value, array, or null)
   * @returns {number} The computed score
   */
  score(value) {
    // Empty containers are treated as NULL — see qti-is-null
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#OpIsNull
    const isEmptyContainer =
      this.cardinality !== 'single' && Array.isArray(value) && value.length === 0;
    if (value == null || isEmptyContainer) return this.clampScore(this.defaultValue);

    let score = 0;

    // For multiple/ordered cardinality, the value is a container (array of values).
    // For single cardinality, even compound types like pair/point are a single value.
    const isContainer = Array.isArray(value) && this.cardinality !== 'single';

    if (isContainer) {
      // qti-map-response: "If a container contains multiple instances of
      // the same value then that value is counted once only" — v3 section
      // 2.11.1.5
      //   https://www.imsglobal.org/spec/qti/v3p0/info/#ExpMapResponse
      // For pair baseType, deduplication uses normalized order so (B,A) === (A,B).
      const seen = new Set();
      for (const v of value) {
        const key = this._key(v);
        if (seen.has(key)) continue;
        seen.add(key);
        score += this._lookup(key) ?? this.defaultValue;
      }
    } else {
      score = this._lookup(this._key(value)) ?? this.defaultValue;
    }

    return this.clampScore(score);
  }
}
