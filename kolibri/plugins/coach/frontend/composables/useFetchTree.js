import { get, set } from '@vueuse/core';
import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';

/**
 * Composable for fetching a content node tree with pagination support.
 * @param {object} root0 - Options object.
 * @param {object} root0.topicId - A ref containing the topic ID to fetch.
 * @param {object} root0.params - Additional query parameters to include in the fetch request.
 * @returns {object} Reactive topic, resources, loading state, and fetch methods.
 */
export default function useFetchTree({ topicId, params = {} } = {}) {
  const _topic = ref(null);

  const _resources = ref([]);

  const _loading = ref(false);

  const _moreParams = ref(null);

  const hasMore = computed(() => get(_moreParams) !== null);
  /**
   * Fetches the content node tree for the current topic using the given parameters.
   * @param {object} params - Query parameters for the fetch request.
   * @returns {Promise<Array>} Resolves with the list of child content nodes.
   */
  async function _fetchNodeTree(params) {
    set(_loading, true);

    return ContentNodeResource.fetchTree({ id: get(topicId), params }).then(topicTree => {
      // results is the list of all children from this call to the API
      // more is an object that contains the parameters we need to fetch the next batch of nodes
      const { results, more } = topicTree.children || { results: [], more: null };
      const moreParams = more?.params || null;

      set(_resources, [...get(_resources), ...results]);
      set(_topic, topicTree);
      set(_moreParams, moreParams);
      set(_loading, false);

      return results;
    });
  }

  /**
   * Fetches the initial content node tree for the current topic.
   * @returns {Promise<Array>} Resolves with the list of child content nodes.
   */
  async function fetchTree() {
    return _fetchNodeTree(params);
  }

  /**
   * Fetches the next page of content nodes using the stored pagination parameters.
   * @returns {Promise<Array>} Resolves with the next batch of child content nodes.
   */
  async function fetchMore() {
    if (!get(hasMore)) {
      return Promise.reject('Tried to call fetchMore when no more ContentNodes are available');
    }
    return _fetchNodeTree(get(_moreParams));
  }

  return {
    topic: computed(() => get(_topic)),
    resources: computed(() => get(_resources)),
    loading: computed(() => get(_loading)),
    fetchTree,
    fetchMore,
    hasMore,
  };
}
