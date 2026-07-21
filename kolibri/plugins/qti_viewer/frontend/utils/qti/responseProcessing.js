/**
 * QTI Response Processing Module
 * Implements response processing rules for QTI 3.0
 *
 * Response processing is the process by which the item session determines the
 * values of the outcomes based on the candidate's responses. The process takes
 * place after response processing validation.
 */

import logger from 'kolibri-logging';
import { ruleHandlers } from './declarations/index.js';
import { evaluateNode } from './evaluator.js';

const logging = logger.getLogger(__filename);

/**
 * Exception thrown when qti-exit-response is encountered
 * Used to exit response processing early
 */
export class ExitResponseException extends Error {
  constructor(message = 'Exit response processing') {
    super(message);
    this.name = 'ExitResponseException';
  }
}

/**
 * Processes a qti-set-outcome-value rule
 * Sets the value of an outcome variable to the result of an expression
 * @param {Element} node - The `<qti-set-outcome-value>` element to process
 * @param {object} combinedVars - Combined response + outcome variables (mutated for outcomes)
 * @param {object} declarations - Variable declarations
 */
function processSetOutcomeValue(node, combinedVars, declarations) {
  const identifier = node.getAttribute('identifier');
  if (node.children.length === 0) {
    return;
  }

  // The first child should be an expression
  const value = evaluateNode(node.children[0], combinedVars, declarations);

  // Coerce the value to the declaration's type when a declaration exists
  const declaration = declarations[identifier];
  if (declaration && value != null) {
    try {
      combinedVars[identifier] = declaration.coerceValue(value);
    } catch (e) {
      // Log and skip rather than crashing — a type mismatch in one rule
      // should not abort processing of subsequent rules.
      logging.warn(`Failed to set outcome '${identifier}': ${e.message}`);
    }
  } else {
    combinedVars[identifier] = value;
  }
}

/**
 * Processes response rules within a container (response-if, response-else-if, response-else)
 * @param {Element[]} rules - Array of rule elements to process
 * @param {object} combinedVars - Combined response + outcome variables (mutated for outcomes)
 * @param {object} declarations - Variable declarations
 * @throws {ExitResponseException} When a qti-exit-response rule is encountered
 */
function processRules(rules, combinedVars, declarations) {
  for (const rule of rules) {
    const tagName = rule.tagName.toLowerCase();

    switch (tagName) {
      case 'qti-set-outcome-value':
        processSetOutcomeValue(rule, combinedVars, declarations);
        break;

      case 'qti-response-condition':
        processResponseCondition(rule, combinedVars, declarations);
        break;

      case 'qti-exit-response':
        throw new ExitResponseException();

      default: {
        const handler = ruleHandlers[tagName];
        if (handler) {
          handler(rule, combinedVars, declarations, evaluateNode);
        } else {
          logging.warn(`Unknown response-processing rule: ${tagName}`);
        }
        break;
      }
    }
  }
}

/**
 * Processes a qti-response-if or qti-response-else-if element
 * @param {Element} node - The response-if or response-else-if node
 * @param {object} combinedVars - Combined response + outcome variables (mutated for outcomes)
 * @param {object} declarations - Variable declarations
 * @returns {boolean} True if the condition was true and rules were executed
 */
function processResponseIfBranch(node, combinedVars, declarations) {
  if (node.children.length === 0) {
    return false;
  }

  // First child is the condition expression
  const conditionResult = evaluateNode(node.children[0], combinedVars, declarations);

  // If condition is true (not null, not false), execute the rules
  if (conditionResult === true) {
    // Remaining children are rules
    processRules([...node.children].slice(1), combinedVars, declarations);
    return true;
  }

  return false;
}

/**
 * Processes a qti-response-else element
 * @param {Element} node - The `<qti-response-else>` element to process
 * @param {object} combinedVars - Combined response + outcome variables (mutated for outcomes)
 * @param {object} declarations - Variable declarations
 */
function processResponseElse(node, combinedVars, declarations) {
  processRules([...node.children], combinedVars, declarations);
}

/**
 * Processes a qti-response-condition element
 * Implements if/else-if/else logic for response processing
 * @param {Element} node - The `<qti-response-condition>` element to process
 * @param {object} combinedVars - Combined response + outcome variables (mutated for outcomes)
 * @param {object} declarations - Variable declarations
 */
function processResponseCondition(node, combinedVars, declarations) {
  for (const child of node.children) {
    const tagName = child.tagName.toLowerCase();

    switch (tagName) {
      case 'qti-response-if':
      case 'qti-response-else-if':
        // If this branch executes, stop processing further branches
        if (processResponseIfBranch(child, combinedVars, declarations)) {
          return;
        }
        break;

      case 'qti-response-else':
        // Execute else and return (it's always last)
        processResponseElse(child, combinedVars, declarations);
        return;

      default:
        // Unknown element, skip
        break;
    }
  }
}

/**
 * Main entry point for response processing. Evaluates the rules under a
 * `<qti-response-processing>` node against the current response variables
 * and returns an updated outcome-values object.
 *
 * The returned object has exactly the same keys as the input `outcomes`
 * parameter (outcomes not touched by any rule keep their default-reset
 * value). Values are coerced per each declaration's type.
 * @param {Element} responseProcessingNode - The qti-response-processing node
 * @param {{[key: string]: import('./values.js').QTIValue}} variables - Current response
 * variable values keyed by identifier
 * @param {{[key: string]: import('./variables.js').QTIVariable}} declarations
 * Variable declarations keyed by identifier
 * @param {{[key: string]: import('./values.js').QTIValue}} outcomes - Current outcome
 * values keyed by identifier. Defines which variables are outcomes (response-processing
 * writes are scoped to these keys).
 * @returns {{[key: string]: import('./values.js').QTIValue}} Updated outcome values,
 * keyed identically to the input `outcomes`.
 * @throws {Error} Re-throws any error raised during rule processing other than early exit
 */
export function processResponses(
  responseProcessingNode,
  variables,
  declarations = {},
  outcomes = {},
) {
  // For non-adaptive items, outcome variables are reset to their declared
  // defaults (or NULL if no default) before each invocation of response
  // processing — v3 section 2.5
  //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
  // NOTE: adaptive items retain outcomes between attempts — not yet supported.
  // The outcomes parameter is authoritative: its keys define which variables
  // are outcomes. We do not discover outcomes from declarations, because
  // declarations may also contain response and context variables.
  const resetOutcomes = {};
  for (const key of Object.keys(outcomes)) {
    resetOutcomes[key] = declarations[key] ? declarations[key].defaultValue : null;
  }

  // Build combined variables once; outcome updates are written directly to this object
  const combinedVars = { ...variables, ...resetOutcomes };
  const outcomeKeys = Object.keys(resetOutcomes);

  // Extract updated outcome values from the combined object
  const extractOutcomes = () => {
    const result = {};
    for (const key of outcomeKeys) {
      result[key] = combinedVars[key];
    }
    return result;
  };

  try {
    processRules([...responseProcessingNode.children], combinedVars, declarations);
  } catch (error) {
    if (error instanceof ExitResponseException) {
      // Normal early exit, return current outcomes
      return extractOutcomes();
    }
    // Re-throw other errors
    throw error;
  }

  return extractOutcomes();
}
