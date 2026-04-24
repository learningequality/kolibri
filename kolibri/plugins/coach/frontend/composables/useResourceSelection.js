import uniqBy from 'lodash/uniqBy';
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router/composables';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import useBaseSearch from 'kolibri-common/composables/useBaseSearch';
import useFetch from 'kolibri-common/composables/useFetch.js';

/**
 * @typedef {import('kolibri-common/composables/useFetch.js').FetchObject} FetchObject
 */

/**
 * Composable for managing resource selection across bookmarks, channels, topic trees, and search.
 * @param {object} root0 - Options object.
 * @param {string} root0.searchResultsRouteName - Route name to navigate to for search results.
 * @param {object} root0.bookmarks - Bookmark fetch configuration with filters and annotator.
 * @param {object} root0.channels - Channel fetch configuration with optional filters and annotator.
 * @param {object} root0.topicTree - Topic tree fetch configuration with filters and annotator.
 * @param {object} root0.search - Search configuration with optional filters.
 * @returns {object} Resource selection state and methods.
 */
export default function useResourceSelection({
  searchResultsRouteName,
  bookmarks,
  channels,
  topicTree,
  search,
} = {}) {
  const route = useRoute();
  const topicId = computed(() => route.query.topicId);

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
    const { searchTopicId, searchResultTopicId } = route.query;

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
