import { get, set } from '@vueuse/core';
import { ref, watch } from 'vue';
import logger from 'kolibri-logging';
import client from 'kolibri/client';
import { parseXML } from '../utils/xml';

const logging = logger.getLogger(__filename);

// Reusable composable for loading any QTI resource from a URL
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
