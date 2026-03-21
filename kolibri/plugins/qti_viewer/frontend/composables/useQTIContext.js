/**
 * QTI Context Composable. See `useQTIContext` for the public API.
 */

import { provide, toRef } from 'vue';
import { useDeclarations, getQTIDeclarations } from './useDeclarations.js';
import { useResponseProcessingTemplate } from './useResponseProcessingTemplate.js';
import { useContextHierarchy } from './useContextHierarchy.js';
import { useResponseProcessing } from './useResponseProcessing.js';

// Re-export for callers that parse declarations directly without a full context
// (e.g., tests, utility code).
export { getQTIDeclarations };

/**
 * @typedef {object} QTIContext
 * @property {import('vue').ComputedRef<object>} responses
 * Local response QTIVariables keyed by identifier. Does not inherit from a
 * parent context.
 * @property {import('vue').ComputedRef<object>} outcomes
 * Outcome QTIVariables keyed by identifier. Includes parent outcomes when
 * a parent context is provided.
 * @property {import('vue').ComputedRef<object>} context
 * Merged plain context values (not QTIVariables) keyed by identifier. Applies
 * record-field merging and null-inherits-parent semantics across scopes.
 * @property {import('vue').ComputedRef<object>} contextDeclarations
 * Local context QTIVariables keyed by identifier.
 * @property {Promise<void>} ready
 * Resolves once the current xmlDoc's response-processing node has been
 * resolved (synchronously or via the injected `qtiPackage`). A fresh promise
 * is installed when xmlDoc changes, so callers can await re-resolution.
 * @property {(xmlNodeOrString: Element|string) => import('vue').ComputedRef} createExpression
 * Compile a QTI expression into a computed ref that reactively evaluates
 * against the merged variable views.
 * @property {() => void} processResponses
 * Run the resolved response-processing node; writes results to local
 * outcomes and bumps the reactive version.
 * @property {() => void} reset
 * Reset all local response and outcome variables to their defaults.
 * @property {object} [externalContext]
 * Present only when passed via `options.externalContext`; forwarded to
 * child components via `provide('qtiContext', ...)`.
 */

/**
 * Orchestrating composable for QTI items. Composes four internal composables
 * (declarations, template resolution, hierarchy, response processing) and
 * exposes a stable public API. Downstream components should depend on the
 * returned object shape, not on the sub-composables.
 * @param {object} props - Component props object (reactive). Must contain `xmlDoc`.
 * @param {object} [options] - Non-reactive configuration options
 * @param {Function} [options.onValueChange] - Callback invoked when any variable value changes
 * @param {object} [options.parentContext] - Parent QTI context for hierarchical scoping
 * @param {object} [options.externalContext] - External context to provide to children
 * @returns {QTIContext}
 */
export function useQTIContext(props, options = {}) {
  // Create a reactive ref for xmlDoc that tracks the component prop.
  // toRef creates a ref that stays in sync with the source property,
  // so Vue's computed/watch can track changes to props.xmlDoc.
  const xmlDoc = toRef(props, 'xmlDoc');

  const onValueChange = typeof options.onValueChange === 'function' ? options.onValueChange : null;

  const { responses, localOutcomes, localContextDeclarations, trackVersion, incrementVersion } =
    useDeclarations(xmlDoc, onValueChange);

  const template = useResponseProcessingTemplate(xmlDoc);

  const { outcomes, context, allDeclarations, allVariables } = useContextHierarchy(
    { responses, localOutcomes, localContextDeclarations, trackVersion },
    options.parentContext,
  );

  const { createExpression, processResponses } = useResponseProcessing({
    allDeclarations,
    allVariables,
    localOutcomes,
    incrementVersion,
    getResolvedRPNode: template.getResolvedRPNode,
  });

  /**
   * Reset all variables to their default values
   */
  function reset() {
    // Reset response variables
    for (const variable of Object.values(responses.value)) {
      variable.reset();
    }

    // Reset outcome variables
    for (const variable of Object.values(localOutcomes.value)) {
      variable.reset();
    }

    incrementVersion();
  }

  // Provide context to child components
  const contextToProvide = {
    responses,
    outcomes,
    context,
    contextDeclarations: localContextDeclarations,
    get ready() {
      return template.ready;
    },
    createExpression,
    processResponses,
    reset,
  };

  // Add externalContext if provided
  if (options.externalContext) {
    contextToProvide.externalContext = options.externalContext;
  }

  provide('qtiContext', contextToProvide);

  return contextToProvide;
}
