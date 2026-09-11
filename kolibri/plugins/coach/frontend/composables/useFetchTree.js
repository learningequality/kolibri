import { get, set } from '@vueuse/core';
import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';

/**
 * @typedef {import('kolibri-common/apiResources/ContentNodeResource').ContentNode} ContentNode
 */

/**
 * @typedef {object} FetchTreeConfig
 * @property {computed<string|null|undefined>} topicId - The id of the root node to fetch the
 * children for.
 * @property {object} [params] - Params to pass to the `ContentNodeResource.fetchTree` method;
 * this can include any keys that our API supports for filtering the results. Example:
 * `{kind_in: [ContentNodeKinds.EXERCISE, ContentNodeKinds.TOPIC]}`. Default: `{}`.
 */

/**
 * An API wrapper for fetching contents by way of the `ContentNodeResource.fetchTree` method
 * with specific helper methods for lazily loading more of the contents within a topic.
 * @module useFetchTree
 * @param {FetchTreeConfig} config - Fetch tree configuration.
 * @returns {object} Reactive topic, resources, loading state, and fetch methods.
 */
export default function useFetchTree({ topicId, params = {} } = {}) {
  // Private variables
  //
  // Note that the _ prefix is used here to indicate that these are values that should only
  // be able to be mutated within this module and are read-only outside of it. To make
  // changes to these values, use the methods provided by this module (or add a method, if
  // needed).

  /** @type {ref<ContentNode|null>} The topic node that we are fetching the children for */
  const _topic = ref(null);

  /** @type {ref<ContentNode[]>} All resources which have been fetched */
  const _resources = ref([]);

  /** @type {ref<boolean>} Whether we are currently fetching/processing the child nodes */
  const _loading = ref(false);

  /**
   * @type {ref<object|null>} The params object we pass to the `ContentNodeResource.fetchTree`
   *   method to fetch the next batch of nodes. Note that the `more` we get from the API will
   *   include the same parameters as we sent in the first call. When null, there are no more
   *   to fetch for the current topicId.
   */
  const _moreParams = ref(null);

  const hasMore = computed(() => get(_moreParams) !== null);
  /**
   * Fetches a batch of content nodes under the current topic.
   * @param {object} params - Params to pass to the `ContentNodeResource.fetchTree` method
   * (default: `{}`).
   * @returns {Promise<ContentNode[]>} Resolves with the list of resources fetched.
   * @affects _resources - The list of resources will be updated with the new list of resources.
   * @affects _loading - The loading state will be set to true while the fetch is in progress
   *   and then set to false when it completes.
   * @affects _moreParams
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

  async function fetchTree() {
    return _fetchNodeTree(params);
  }

  /**
   * Fetches the next batch of nodes, which fetchTree will do on its own, but this makes
   * for an easier-to-understand API.
   * @returns {Promise<ContentNode[]>} Resolves with the next batch of resources.
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
