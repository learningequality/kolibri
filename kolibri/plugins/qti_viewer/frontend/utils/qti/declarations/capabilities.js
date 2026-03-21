/**
 * Capability name constants for QTI variable declarations.
 *
 * Used by declaration strategy classes when registering capabilities
 * on QTIVariable, and by QTIVariable when looking them up.
 * Using constants prevents silent failures from typos in capability names.
 * @module declarations/capabilities
 */

/** @enum {string} */
export const CAPABILITY = {
  DEFAULT_VALUE: 'defaultValue',
  CORRECT_RESPONSE: 'correctResponse',
  SCORE: 'score',
  LOOKUP: 'lookup',
};
