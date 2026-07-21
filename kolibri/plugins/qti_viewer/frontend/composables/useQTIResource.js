import { get, set } from '@vueuse/core';
import { ref, watch } from 'vue';
import logger from 'kolibri-logging';
import client from 'kolibri/client';
import { parseXML } from '../utils/xml';

const logging = logger.getLogger(__filename);

/**
 * @typedef {object} QTIResource
 * @property {import('vue').Ref<Document|null>} xmlDoc
 * Parsed XML document for the resource, or `null` before the first fetch
 * resolves or when `resourceUrl` is falsy.
 * @property {import('vue').Ref<boolean>} loading
 * `true` while the resource fetch is in flight.
 * @property {import('vue').Ref<Error|null>} error
 * The last fetch/parse error, or `null` when the most recent load
 * succeeded (or hasn't started).
 */

/**
 * Fetch and parse a QTI XML resource from a URL. Refetches when `resourceUrl`
 * changes.
 * @param {string|import('vue').Ref<string>} resourceUrl
 * The resource URL, as a plain string or a Vue ref. Unwrapping via
 * `@vueuse/core#get` handles both shapes; pass a ref to re-fetch reactively.
 * @returns {QTIResource}
 */
export default function useQTIResource(resourceUrl) {
  const loading = ref(true);
  const xmlDoc = ref(null);
  const error = ref(null);

  async function loadResource() {
    const url = get(resourceUrl);
    if (!url) {
      set(loading, false);
      return;
    }

    try {
      set(loading, true);
      set(error, null);
      const response = await client(url);
      const doc = parseXML(response.data);
      set(xmlDoc, doc);
    } catch (err) {
      logging.error('Error loading QTI resource:', err);
      set(error, err);
    } finally {
      set(loading, false);
    }
  }

  loadResource();
  watch(resourceUrl, loadResource);

  return {
    xmlDoc,
    loading,
    error,
  };
}
