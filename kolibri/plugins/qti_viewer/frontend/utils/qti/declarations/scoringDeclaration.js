/**
 * Base class for declaration strategies that provide a scoring capability.
 *
 * Handles shared logic: parsing default-value, lower-bound, upper-bound
 * from XML attributes, clamping scores to bounds, and registering the
 * 'score' capability on the parent variable.
 *
 * Subclasses must implement the `score(responseValue)` method.
 * @module declarations/scoringDeclaration
 */
import { CAPABILITY } from './capabilities.js';

export default class ScoringDeclaration {
  /**
   * Parses default-value and bounds, and registers the score capability.
   * @param {Element} xmlNode - The declaration XML element (e.g., qti-mapping, qti-area-mapping)
   * @param {import('../variables.js').QTIVariable} variable - The parent variable to register on
   */
  constructor(xmlNode, variable) {
    /** @type {number} Default score when no mapping entry matches */
    const parsed = parseFloat(xmlNode.getAttribute('default-value'));
    this.defaultValue = isNaN(parsed) ? 0 : parsed;

    /** @type {number|null} Minimum allowed score, or null for no lower bound */
    const lb = xmlNode.hasAttribute('lower-bound')
      ? parseFloat(xmlNode.getAttribute('lower-bound'))
      : NaN;
    this.lowerBound = isNaN(lb) ? null : lb;

    /** @type {number|null} Maximum allowed score, or null for no upper bound */
    const ub = xmlNode.hasAttribute('upper-bound')
      ? parseFloat(xmlNode.getAttribute('upper-bound'))
      : NaN;
    this.upperBound = isNaN(ub) ? null : ub;

    variable.registerCapability(CAPABILITY.SCORE, value => this.score(value));
  }

  /**
   * Clamp a raw score to the configured lower and upper bounds.
   * @param {number} score - The raw score
   * @returns {number} The clamped score
   */
  clampScore(score) {
    if (this.lowerBound != null) {
      score = Math.max(score, this.lowerBound);
    }
    if (this.upperBound != null) {
      score = Math.min(score, this.upperBound);
    }
    return score;
  }

  /**
   * Compute a score from a response value. Must be implemented by subclasses.
   * @abstract
   * @param {import('../values.js').QTIValue} responseValue - The response value to score
   * @returns {number} The computed score
   */
  // eslint-disable-next-line no-unused-vars
  score(responseValue) {
    throw new Error('score() must be implemented by subclass');
  }
}
