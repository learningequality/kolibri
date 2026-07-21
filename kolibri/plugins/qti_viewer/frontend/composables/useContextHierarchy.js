/**
 * Hierarchical merging for QTI contexts.
 * See `useContextHierarchy` for the public API.
 */

import { computed } from 'vue';

/**
 * Extract context values from QTIVariable objects.
 * @param {object} contextDeclarations - Map of identifier -> QTIVariable
 * @returns {object} Map of identifier -> context value
 */
function getContextValues(contextDeclarations) {
  const values = {};
  for (const [id, variable] of Object.entries(contextDeclarations)) {
    values[id] = variable.value;
  }
  return values;
}

/**
 * Merge context objects with inner scope taking precedence.
 * For record types, merge the record fields.
 * @param {object} parentContext - Parent context values
 * @param {object} localContext - Local context values
 * @returns {object} Merged context
 */
function mergeContextRecords(parentContext, localContext) {
  const result = { ...parentContext };

  for (const [key, value] of Object.entries(localContext)) {
    if (value === null && parentContext[key] !== undefined) {
      // Empty declaration, inherit from parent
      result[key] = parentContext[key];
    } else if (
      typeof value === 'object' &&
      value !== null &&
      typeof parentContext[key] === 'object' &&
      parentContext[key] !== null
    ) {
      // Merge record fields
      result[key] = { ...parentContext[key], ...value };
    } else {
      // Override with local value
      result[key] = value;
    }
  }

  return result;
}

/**
 * @typedef {object} HierarchicalContext
 * @property {import('vue').ComputedRef<object>} outcomes
 * Merged outcome QTIVariables: `{identifier: QTIVariable}`.
 * Includes parent outcomes when a parent context is provided.
 * @property {import('vue').ComputedRef<object>} context
 * Merged plain context values: `{identifier: value}`. Applies record-field
 * merging and null-inherits-parent semantics across scopes.
 * @property {import('vue').ComputedRef<object>} allDeclarations
 * Union of response/outcome/context QTIVariable declarations across the
 * whole ancestor chain plus local scope, keyed by identifier.
 * @property {import('vue').ComputedRef<object>} allVariables
 * Current value snapshots for every reachable variable, keyed by identifier.
 */

/**
 * Produce hierarchical views (outcomes, context, allDeclarations, allVariables)
 * by merging local declarations with an optional parent context.
 * @param {object} local - Local declarations and reactivity hooks from useDeclarations
 * @param {import('vue').ComputedRef<object>} local.responses - Local response QTIVariables
 * @param {import('vue').ComputedRef<object>} local.localOutcomes - Local outcome QTIVariables
 * @param {import('vue').ComputedRef<object>} local.localContextDeclarations - Local context decls
 * @param {Function} local.trackVersion - Call in a computed to depend on variable values
 * @param {object} [parentContext] - Parent QTI context for hierarchical scoping
 * @returns {HierarchicalContext}
 */
export function useContextHierarchy(local, parentContext) {
  const { responses, localOutcomes, localContextDeclarations, trackVersion } = local;

  // Outcome declarations: { identifier: QTIVariable }
  // Merges parent QTIVariables when in a hierarchy; processResponses() writes internally.
  const outcomes = parentContext
    ? computed(() => {
        return { ...parentContext.outcomes.value, ...localOutcomes.value };
      })
    : localOutcomes;

  // Context declarations with hierarchical inheritance (plain values for consumers)
  const context = computed(() => {
    const localContext = getContextValues(localContextDeclarations.value);
    const parentContextValues = parentContext?.context?.value || {};
    return mergeContextRecords(parentContextValues, localContext);
  });

  /**
   * All declarations (responses + outcomes) merged from parent and local scope.
   * Cached as a computed ref — shared across all expressions in this context.
   * @type {import('vue').ComputedRef<object>}
   */
  const allDeclarations = computed(() => {
    // No trackVersion() here — declarations (QTIVariable objects) only change
    // when the XML document changes, not when variable values change.
    const result = {};
    if (parentContext) {
      Object.assign(result, parentContext.responses?.value || {});
      Object.assign(result, parentContext.outcomes?.value || {});
      Object.assign(result, parentContext.contextDeclarations?.value || {});
    }
    Object.assign(result, responses.value);
    Object.assign(result, localOutcomes.value);
    Object.assign(result, localContextDeclarations.value);
    return result;
  });

  /**
   * All current variable values merged from parent and local scope.
   * Cached as a computed ref — shared across all expressions in this context.
   * @type {import('vue').ComputedRef<object>}
   */
  const allVariables = computed(() => {
    trackVersion();
    const result = {};

    // Get parent variables first
    if (parentContext) {
      // Include parent responses (always QTIVariable instances from getQTIDeclarations)
      for (const [id, variable] of Object.entries(parentContext.responses?.value || {})) {
        result[id] = variable.value;
      }
      // Include parent outcomes (QTIVariable objects)
      for (const [id, variable] of Object.entries(parentContext.outcomes?.value || {})) {
        result[id] = variable.value;
      }
    }

    // Add context values (from merged context including parent)
    Object.assign(result, context.value);

    // Add local responses
    for (const [id, variable] of Object.entries(responses.value)) {
      result[id] = variable.value;
    }

    // Add local outcomes
    for (const [id, variable] of Object.entries(localOutcomes.value)) {
      result[id] = variable.value;
    }

    return result;
  });

  return {
    outcomes,
    context,
    allDeclarations,
    allVariables,
  };
}
