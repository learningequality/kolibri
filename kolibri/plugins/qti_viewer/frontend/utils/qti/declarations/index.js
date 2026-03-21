/**
 * Declaration registry for QTI variable declarations.
 *
 * Maps XML tag names to declaration strategy classes, and rule tag names
 * to static rule handler functions. Used by the response processing
 * engine to dispatch parsing and rule evaluation without switch/case.
 * @module declarations/index
 */
import Mapping from './mapping.js';
import AreaMapping from './areaMapping.js';
import CorrectResponse from './correctResponse.js';
import DefaultValue from './defaultValue.js';
import LookupTable from './lookupTable.js';

// Re-export CAPABILITY from its own module (avoids circular imports
// since declaration classes import CAPABILITY and index.js imports them)
export { CAPABILITY } from './capabilities.js';

/**
 * Registry of XML tag names to declaration strategy constructors.
 * Each constructor accepts (xmlNode, variable) and registers capabilities.
 * @type {{[key: string]: Function}}
 */
export const declarationParsers = {
  'qti-mapping': Mapping,
  'qti-area-mapping': AreaMapping,
  'qti-correct-response': CorrectResponse,
  'qti-default-value': DefaultValue,
  'qti-interpolation-table': LookupTable,
  'qti-match-table': LookupTable,
};

/**
 * Registry of response rule tag names to handler functions.
 * Each handler accepts (ruleNode, combinedVars, declarations, evaluateNode).
 * The evaluateNode function is injected by the response processing engine
 * to avoid circular imports between declarations and the evaluator.
 * @type {{[key: string]: Function}}
 */
export const ruleHandlers = {
  'qti-lookup-outcome-value': LookupTable.processRule,
};
