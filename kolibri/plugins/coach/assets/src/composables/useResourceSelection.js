import uniqBy from 'lodash/uniqBy';
import { ref, computed, getCurrentInstance, watch } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import useBaseSearch from 'kolibri-common/composables/useBaseSearch';
import useFetch from './useFetch';

/**
 * @typedef {import('../../../../../../composables/useFetch').FetchObject} FetchObject
 */

/**
 * Composable for managing the selection of resources within a topic tree.
 * This utility handles selection rules, manages fetch states for channels, bookmarks,
 * and topic trees, and offers methods to add, remove, or override selected resources.
 *
 * @param {Object} options
 * @param {Object} options.bookmarks Configuration object for bookmarks fetch. It can contain
 * `filters` an object with extra query params, and `annotator` a function to annotate the results.
 * @param {Object} options.channels Configuration object for channels fetch. It can contain
 * `filters` an object with extra query params, and `annotator` a function to annotate the results.
 * @param {Object} options.topicTree Configuration object for topic tree fetch. It can contain
 * `filters` an object with extra query params, and `annotator` a function to annotate the results.
 * @param {string} options.searchResultsRouteName The name of the route where the search results
 *  will be displayed so that we can redirect to it when the search terms are updated.
 * @param {Object} options.search Configuration object for search fetch. It can contain
 * `filters` an object with extra query params that will be present in all search requests.
 *
 * @typedef {Object} UseResourceSelectionResponse
 * @property {Object} topic Topic tree object, contains the information of the topic,
 *   its ascendants and children.
 *   Defined only if the `topicId` query in the route is set.
 * @property {boolean} loading Indicates whether the main topic tree, channels, and bookmarks
 *   data are currently loading. This does not account for loading more data. For such cases,
 *   use the fetch objects of each entity.
 * @property {FetchObject} channelsFetch Channels fetch object to manage the process of
 *   fetching channels. We currently don't support fetching more channels.
 * @property {FetchObject} bookmarksFetch Bookmarks fetch object to manage the process of
 *   fetching bookmarks. Fetching more bookmarks is supported.
 * @property {FetchObject} treeFetch Topic tree fetch object to manage the process of
 *   fetching topic trees and their resources. Fetching more resources is supported.
 * @property {FetchObject} searchFetch Search fetch object to manage the process of
 *   fetching search results. Fetching more search results is supported.
 * @property {Array<string>} searchTerms The search terms used to filter the search results.
 * @property {boolean} displayingSearchResults Indicates whether we currently have search terms.
 * @property {Array<(node: Object) => boolean>} selectionRules An array of functions that determine
 *   whether a node can be selected.
 * @property {Array<Object>} selectedResources An array of currently selected resources.
 * @property {(resources: Array<Object>) => void} selectResources Adds the specified resources
 *   to the `selectedResources` array.
 * @property {(resources: Array<Object>) => void} deselectResources Removes the specified resources
 *   from the `selectedResources` array.
 * @property {(resources: Array<Object>) => void} setSelectedResources Replaces the current
 *   `selectedResources` array with the provided resources array.
 * @property {() => void} clearSearch Clears the current search terms and results.
 * @property {(tag: Object) => void} removeSearchFilterTag Removes the specified tag from the
 *  search terms.
 *
 * @returns {UseResourceSelectionResponse}
 */
export default function useResourceSelection({
  searchResultsRouteName,
  bookmarks,
  channels,
  topicTree,
  search,
} = {}) {
  const store = getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);
  const topicId = computed(() => route.value.query.topicId);

  const selectionRules = ref([]);
  const selectedResources = ref([]);
  const topic = ref(null);

  const fetchBookmarks = async params => {
    const response = await ContentNodeResource.fetchBookmarks(params);
    if (bookmarks?.annotator) {
      const annotatedResults = await bookmarks.annotator(response.results);
      return {
        ...response,
        results: annotatedResults,
        count: annotatedResults.length,
      };
    }
    return response;
  };
  const bookmarksFetch = useFetch({
    fetchMethod: () =>
      fetchBookmarks({
        params: { limit: 25, available: true, ...bookmarks?.filters },
      }),
    fetchMoreMethod: more =>
      ContentNodeResource.fetchBookmarks({
        params: more,
      }),
  });

  const fetchChannels = async () => {
    const result = await ChannelResource.fetchCollection({
      getParams: {
        available: true,
        ...channels?.filters,
      },
    });
    if (channels?.annotator) {
      return channels.annotator(result);
    }
    return result;
  };
  const channelsFetch = useFetch({
    fetchMethod: fetchChannels,
  });

  // We need to wait for the proper topic to load so the `topic` ref which is a
  // dependency of the useBaseSearch composable is correctly set before searching.
  const waitForTopicLoad = () => {
    const { searchTopicId, searchResultTopicId } = route.value.query;

    // If we are browsing a topic from the search results (searchResultTopicId is set)
    // then the topic to wait for is `searchTopicId`. `searchTopicId` is the topic
    // that the search results are scoped to.
    const topicToWaitFor = searchResultTopicId ? searchTopicId : topicId.value;

    if (!topicToWaitFor || topicToWaitFor === topic.value?.id) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const unwatch = watch(topic, () => {
        if (topic.value?.id === topicToWaitFor) {
          unwatch();
          resolve();
        }
      });
    });
  };

  const useSearchObject = useBaseSearch({
    descendant: topic,
    searchResultsRouteName,
    // As we dont always show the search filters, we dont need to reload the search results
    // each time the topic changes if not needed
    reloadOnDescendantChange: false,
    filters: search?.filters,
  });
  const searchFetch = {
    data: useSearchObject.results,
    loading: useSearchObject.searchLoading,
    hasMore: computed(() => !!useSearchObject.more.value),
    loadingMore: useSearchObject.moreLoading,
    fetchData: async () => {
      // Make sure that the topic is loaded before searching
      await waitForTopicLoad();
      return useSearchObject.search();
    },
    fetchMore: useSearchObject.searchMore,
  };

  const { displayingSearchResults } = useSearchObject;

  const fetchTree = async (params = {}) => {
    const newTopic = await ContentNodeResource.fetchTree(params);
    if (topic.value?.id !== newTopic.id) {
      topic.value = newTopic;
    }
    if (topicTree?.annotator) {
      const annotatedResults = await topicTree.annotator(newTopic.children?.results || []);
      return {
        ...newTopic.children,
        results: annotatedResults,
      };
    }
    return newTopic.children || { results: [] };
  };

  const treeFetch = useFetch({
    fetchMethod: () =>
      fetchTree({
        id: topicId.value,
        params: { include_coach_content: true, ...topicTree?.filters },
      }),
    fetchMoreMethod: more => fetchTree(more),
  });

  watch(topicId, () => {
    if (topicId.value) {
      treeFetch.fetchData();
    } else {
      topic.value = null;
    }
  });

  const loading = computed(() => {
    const sources = [bookmarksFetch, channelsFetch, treeFetch, searchFetch];

    return sources.some(sourceFetch => sourceFetch.loading.value);
  });

  const fetchInitialData = async () => {
    bookmarksFetch.fetchData();
    channelsFetch.fetchData();
    if (topicId.value) {
      treeFetch.fetchData();
    }
    if (displayingSearchResults.value) {
      searchFetch.fetchData();
    }
  };

  fetchInitialData();

  const selectResources = (resources = []) => {
    if (!resources || !resources.length) {
      return;
    }
    if (resources.length === 1) {
      const [newResource] = resources;
      if (!selectedResources.value.find(res => res.id === newResource.id)) {
        selectedResources.value = [...selectedResources.value, newResource];
      }
    } else {
      selectedResources.value = uniqBy([...selectedResources.value, ...resources], 'id');
    }
  };

  const deselectResources = (resources = []) => {
    if (!resources || !resources.length) {
      return;
    }
    selectedResources.value = selectedResources.value.filter(res => {
      return !resources.find(unselectedResource => unselectedResource.id === res.id);
    });
  };

  const setSelectedResources = (resources = []) => {
    selectedResources.value = resources;
  };

  return {
    topic,
    loading,
    treeFetch,
    channelsFetch,
    bookmarksFetch,
    searchFetch,
    selectionRules,
    selectedResources,
    searchTerms: useSearchObject.searchTerms,
    displayingSearchResults: useSearchObject.displayingSearchResults,
    selectResources,
    deselectResources,
    setSelectedResources,
    clearSearch: useSearchObject.clearSearch,
    removeSearchFilterTag: useSearchObject.removeFilterTag,
  };
}
