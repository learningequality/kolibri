/**
 * Declaration parsing and caching for QTI contexts.
 * See `useDeclarations` for the public API.
 */

import { computed, onUnmounted, ref } from 'vue';
import { QTIVariable } from '../utils/qti/variables.js';

/**
 * Extract QTI declarations of a specific type from an XML document
 * @param {Document} xmlDocument - The QTI XML document
 * @param {string} declarationType - 'response', 'outcome', or 'context'
 * @param {Function} valueSetCallback - Optional callback when value is set
 * @returns {object} Map of identifier -> QTIVariable
 */
export function getQTIDeclarations(xmlDocument, declarationType, valueSetCallback) {
  const declarations = {};

  const selector = `qti-${declarationType}-declaration`;

  const nodes = xmlDocument.querySelectorAll(selector);

  for (const node of nodes) {
    const variable = new QTIVariable(node, valueSetCallback);
    declarations[variable.identifier] = variable;
  }
  return declarations;
}

/**
 * @typedef {object} Declarations
 * @property {import('vue').ComputedRef<object>} responses
 * Local response QTIVariables keyed by identifier. Does NOT inherit from
 * a parent context — responses are always scoped to the current item.
 * @property {import('vue').ComputedRef<object>} localOutcomes
 * Local outcome QTIVariables keyed by identifier. Hierarchical merging
 * with parent outcomes is handled by `useContextHierarchy`.
 * @property {import('vue').ComputedRef<object>} localContextDeclarations
 * Local context QTIVariables keyed by identifier.
 * @property {() => number} trackVersion
 * Call inside a computed to take a reactive dependency on variable values.
 * QTIVariable caches are plain objects (not reactive), so computeds that
 * read variable values must track this version counter instead.
 * @property {() => void} incrementVersion
 * Bump the version counter after mutating variable values. Also fires the
 * `onValueChange` callback if one was provided.
 */

/**
 * Parse response/outcome/context declarations from the current XML document,
 * lazily and cached until the xmlDoc ref changes. Exposes a monotonic version
 * counter so callers can invalidate dependent computeds on value changes.
 * @param {import('vue').Ref<Document|null>} xmlDoc - Reactive ref for the current QTI XML document
 * @param {Function} [onValueChange] - Optional callback fired when any variable value changes
 * @returns {Declarations}
 */
export function useDeclarations(xmlDoc, onValueChange) {
  // Version counter to trigger reactivity when variables change.
  // QTIVariable caches are plain objects (not reactive), so Vue cannot track
  // property changes on them. Computed refs that depend on variable values must
  // read version.value to create a reactive dependency — incrementVersion()
  // then invalidates these computeds whenever any variable value changes.
  const version = ref(0);
  const incrementVersion = () => {
    version.value++;
  };
  // Responses additionally signal "the user interacted". Outcomes only bump
  // the version counter because response processing writes them
  // programmatically — firing onValueChange on outcome writes would loop
  // any caller that re-runs response processing in response to the signal.
  const onResponseValueChange = () => {
    incrementVersion();
    if (onValueChange) {
      onValueChange();
    }
  };
  const trackVersion = () => version.value;

  // Cache for QTIVariable objects - persists across computed re-runs.
  // Using plain objects (not refs) to avoid reactivity issues.
  let responseCacheData = {};
  let outcomeCacheData = {};
  let contextCacheData = {};
  let lastXmlDocRef = null;

  /**
   * Ensure caches are populated for the current XML
   */
  function ensureCachesPopulated() {
    const currentDoc = xmlDoc.value;

    if (!currentDoc) {
      responseCacheData = {};
      outcomeCacheData = {};
      contextCacheData = {};
      lastXmlDocRef = null;
      return;
    }

    // Only rebuild if XML document changed
    if (currentDoc !== lastXmlDocRef) {
      lastXmlDocRef = currentDoc;
      responseCacheData = getQTIDeclarations(currentDoc, 'response', onResponseValueChange);
      outcomeCacheData = getQTIDeclarations(currentDoc, 'outcome', incrementVersion);
      contextCacheData = getQTIDeclarations(currentDoc, 'context');
    }
  }

  // Response declarations: { identifier: QTIVariable }
  // Local only — responses don't inherit from parent.
  const responses = computed(() => {
    ensureCachesPopulated();
    return responseCacheData;
  });

  // Local outcome declarations: { identifier: QTIVariable }
  const localOutcomes = computed(() => {
    ensureCachesPopulated();
    return outcomeCacheData;
  });

  // Local context declarations as QTIVariable objects
  const localContextDeclarations = computed(() => {
    ensureCachesPopulated();
    return contextCacheData;
  });

  // Release QTIVariable refs when the owning component unmounts.
  onUnmounted(() => {
    responseCacheData = {};
    outcomeCacheData = {};
    contextCacheData = {};
    lastXmlDocRef = null;
  });

  return {
    responses,
    localOutcomes,
    localContextDeclarations,
    trackVersion,
    incrementVersion,
  };
}
