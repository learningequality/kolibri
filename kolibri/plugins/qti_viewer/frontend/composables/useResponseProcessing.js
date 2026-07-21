/**
 * Reactive expressions and response processing for QTI contexts.
 * See `useResponseProcessing` for the public API.
 */

import { computed } from 'vue';
import logger from 'kolibri-logging';
import { evaluateNode, validateExpressionNode } from '../utils/qti/evaluator.js';
import { processResponses as processResponsesUtil } from '../utils/qti/responseProcessing.js';
import { parseXML } from '../utils/xml.js';

const logging = logger.getLogger(__filename);

/**
 * @typedef {object} ResponseProcessing
 * @property {(xmlNodeOrString: Element|string) => import('vue').ComputedRef} createExpression
 * Parse (if a string) and compile a QTI expression into a computed ref
 * that reactively evaluates against the merged variable views. Validation
 * depends only on declarations and runs in its own computed, so
 * re-evaluation triggered by variable-value changes does not re-validate.
 * Returns `null` values when validation fails.
 * @property {() => void} processResponses
 * Run the currently resolved response-processing node against the merged
 * variable snapshot. Writes results back to the local outcome QTIVariables
 * Item-level response processing writes only the item's own outcomes;
 * test-level aggregation happens in outcome processing — v3 section 2.5
 * https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
 * Bumps the version to invalidate dependent computeds. No-op when there
 * is no resolved RP node.
 */

/**
 * Expression evaluation and response processing bound to a context's merged
 * views. All reactivity flows through `allDeclarations`/`allVariables` — this
 * composable adds no reactive state of its own.
 * @param {object} deps - Merged reactive views injected from the QTI context
 * @param {import('vue').ComputedRef<object>} deps.allDeclarations - Merged decls for validation
 * @param {import('vue').ComputedRef<object>} deps.allVariables - Merged current variable values
 * @param {import('vue').ComputedRef<object>} deps.localOutcomes
 * Local outcome QTIVariables (write target).
 * @param {() => void} deps.incrementVersion - Bump to signal a processing cycle completed
 * @param {() => (Element|null)} deps.getResolvedRPNode - Returns current resolved RP node or null
 * @returns {ResponseProcessing}
 */
export function useResponseProcessing({
  allDeclarations,
  allVariables,
  localOutcomes,
  incrementVersion,
  getResolvedRPNode,
}) {
  /**
   * Create a reactive computed expression from an XML node or string
   * @param {Element|string} xmlNodeOrString - QTI expression to evaluate, parsed node or raw XML
   * @returns {import('vue').ComputedRef} A computed ref that evaluates the expression reactively
   */
  function createExpression(xmlNodeOrString) {
    let node;

    if (typeof xmlNodeOrString === 'string') {
      // Parse string to XML
      const doc = parseXML(xmlNodeOrString);
      node = doc.documentElement;
    } else {
      node = xmlNodeOrString;
    }

    // Validation depends only on declarations (which variables exist), not on
    // variable values. Separating it into its own computed avoids re-validating
    // on every variable change during user interaction.
    const isValid = computed(() => {
      try {
        validateExpressionNode(node, allDeclarations.value);
        return true;
      } catch (e) {
        logging.warn('QTI expression validation failed:', e.message);
        return false;
      }
    });

    return computed(() => {
      if (!isValid.value) return null;
      return evaluateNode(node, allVariables.value, allDeclarations.value);
    });
  }

  /**
   * Process responses using the response processing rules in the XML
   */
  function processResponses() {
    const rpNode = getResolvedRPNode();
    if (!rpNode) return;

    const variables = allVariables.value;
    const declarations = allDeclarations.value;

    // Collect current outcome values; processResponsesUtil handles the
    // non-adaptive reset to defaults internally — v3 section 2.5
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
    const currentOutcomes = {};
    for (const [id, variable] of Object.entries(localOutcomes.value)) {
      currentOutcomes[id] = variable.value;
    }

    // Item-level response processing is scoped to the item's own outcome
    // variables. Test-level aggregation happens separately via outcome
    // processing, not here — see v3 section 2.5
    //   https://www.imsglobal.org/spec/qti/v3p0/info/#Main2p5
    const updatedOutcomes = processResponsesUtil(rpNode, variables, declarations, currentOutcomes);
    // Note: values in updatedOutcomes are already coerced by processSetOutcomeValue
    // (via declaration.coerceValue). The QTIVariable setter coerces again, but this
    // is harmless (idempotent) and necessary — processSetOutcomeValue must coerce
    // because subsequent expressions in the same processing run read from a plain
    // object and need correctly typed values, while the setter must coerce because
    // it also handles external writes (e.g., interaction events).
    for (const [id, value] of Object.entries(updatedOutcomes)) {
      if (localOutcomes.value[id]) {
        localOutcomes.value[id].value = value;
      }
    }

    incrementVersion();
  }

  return {
    createExpression,
    processResponses,
  };
}
