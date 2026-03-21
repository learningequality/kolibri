/**
 * Response-processing template resolution for QTI contexts.
 * See `useResponseProcessingTemplate` for the public API.
 */

import { inject, isRef, watch } from 'vue';
import logger from 'kolibri-logging';
import {
  resolveResponseProcessingNode,
  getResponseProcessingNode,
} from '../utils/qti/declarations/templates.js';

const logging = logger.getLogger(__filename);

/**
 * @typedef {object} ResponseProcessingTemplate
 * @property {Promise<void>} ready
 * A promise that resolves once the current xmlDoc's response-processing node
 * has been resolved (synchronously from inline rules / cached templates, or
 * asynchronously via the injected `qtiPackage`). Accessed via getter so
 * callers always see the latest promise; a fresh one is installed when
 * xmlDoc changes, so consumers can await re-resolution.
 * @property {() => (Element|null)} getResolvedRPNode
 * Returns the currently resolved `<qti-response-processing>` element, or
 * `null` if the current xmlDoc has no response-processing block.
 */

/**
 * Resolve the `<qti-response-processing>` node for the current XML document.
 * Tries synchronous resolution first (inline rules and pre-cached templates),
 * falling back to async resolution via the injected `qtiPackage`.
 * @param {import('vue').Ref<Document|null>} xmlDoc - Reactive ref for the current QTI XML document
 * @returns {ResponseProcessingTemplate}
 */
export function useResponseProcessingTemplate(xmlDoc) {
  // Inject qtiPackage for custom response processing template resolution.
  // Provided at the top of the component tree (by QTIViewer).
  const injectedQtiPackage = inject('qtiPackage', null);

  // Cached resolved response processing node — resolved once when the
  // XML document is first loaded, so processResponses stays synchronous.
  let resolvedRPNode = null;

  // Response processing template resolution.
  // Try synchronous cache lookup first (covers inline rules and templates
  // pre-fetched by QTIViewer). Fall back to async resolution otherwise,
  // exposing a `ready` promise callers can await.
  let readyResolve;
  let readyPromise = new Promise(resolve => {
    readyResolve = resolve;
  });

  function resolveRPNodeForDoc(doc) {
    const rpElement = doc?.querySelector('qti-response-processing');
    if (!rpElement) {
      resolvedRPNode = null;
      readyResolve();
      return;
    }

    // Try synchronous resolution (inline rules or cached templates)
    const syncResolved = getResponseProcessingNode(rpElement);
    if (syncResolved) {
      resolvedRPNode = syncResolved;
      readyResolve();
      return;
    }

    // Fall back to async resolution for uncached templates.
    // Capture the current doc AND resolve function so the callback can detect
    // staleness: if xmlDoc changes again before this resolves, the result is
    // discarded and the stale resolution does not resolve a newer promise.
    const docAtCallTime = doc;
    const resolveAtCallTime = readyResolve;
    const pkg = isRef(injectedQtiPackage) ? injectedQtiPackage.value : injectedQtiPackage;
    resolveResponseProcessingNode(rpElement, pkg)
      .then(resolved => {
        if (xmlDoc.value !== docAtCallTime) return;
        resolvedRPNode = resolved;
      })
      .catch(err => {
        logging.warn('Failed to resolve response processing template:', err);
      })
      .finally(() => {
        if (xmlDoc.value === docAtCallTime) {
          resolveAtCallTime();
        }
      });
  }

  // Kick off template resolution for the initial XML doc
  const initialDoc = xmlDoc.value;
  if (initialDoc) {
    resolveRPNodeForDoc(initialDoc);
  } else {
    readyResolve();
  }

  // Re-resolve when the XML doc changes, refreshing the ready promise
  watch(
    () => xmlDoc.value,
    newDoc => {
      readyPromise = new Promise(resolve => {
        readyResolve = resolve;
      });
      resolveRPNodeForDoc(newDoc);
    },
  );

  return {
    get ready() {
      return readyPromise;
    },
    getResolvedRPNode() {
      return resolvedRPNode;
    },
  };
}
