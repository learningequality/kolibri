import { ref, computed } from 'vue';

/**
 * A composable for managing fetch operations with optional methods for additional data fetching.
 *
 * @param {Object} options **Required** Configuration options for the fetch operation.
 * @param {(...args) => Promise<any>} options.fetchMethod **Required** Function to fetch the
 * initial data.
 * * Should return a Promise resolving to the fetched data or a `{ results: any[], more: any }`
 *   object. The "results" property should be the fetched data and the "more" property should be
 *   the next "more" object to use in the fetchMore method.
 *
 * Example:
 * ```js
 * const { data, loading, error, fetchData } = useFetch({
 *  fetchMethod: () => ContentNodeResource.fetchBookmarks()
 * })
 * ```
 *
 *
 * @param {(more, ...args) => Promise<any>} [options.fetchMoreMethod] Function to fetch more data.
 * * This function receives a "moreParams" object as its first argument. This moreParams object is
 *   from the "more" property of the response from the previous fetch to fetch more data.
 * * Should return a Promise resolving to { results: any[], more: any }. The "results" property
 *   should be the fetched data and the "more" property should be the next "moreParams" object to
 *   use in the next fetchMore method.
 * * FetchMore just works if the fetched data is an array
 *
 * Example:
 *
 * ```js
 * const { data, loading, error, fetchData } = useFetch({
 *   fetchMethod: () => ContentNodeResource.fetchBookmarks(),
 *   fetchMoreMethod: moreParams => ContentNodeResource.fetchBookmarks(moreParams)
 * })
 * ```
 *
 *
 * @typedef {Object} FetchObject
 * @property {any} data The main fetched data.
 * @property {Object} error Error object if a fetch data failed.
 * @property {any} count The count of the fetched data. E.g., the total number of items.
 * @property {boolean} loading Data loading state. This loading doesnt reflect the loading when
 *   fetching more data. refer to `loadingMore` for that.
 * @property {boolean} loadingMore Loading state when fetching more data. This is different from
 *  `loading` which is for the main data fetch.
 * @property {boolean} hasMore A computed property to check if there is more data to fetch.
 * @property {(...args) => Promise<void>} fetchData A method to manually trigger the main fetch.
 * @property {(...args) => Promise<void>} fetchMore A method to manually trigger fetch more data.
 *
 * @returns {FetchObject} An object with properties and methods for managing the fetch process.
 */
export default function useFetch(options) {
  const { fetchMethod, fetchMoreMethod } = options || {};

  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);
  const moreParams = ref(null);
  const count = ref(null);
  const loadingMore = ref(false);

  // useFetch metadata to manage synchronization of fetches
  const _fetchCount = ref(0);

  const hasMore = computed(() => moreParams.value != null);

  const _setData = (response, loadingMore) => {
    const responseData = fetchMoreMethod ? response.results : response;

    /**
     * For now, loading more just  works if the data is an array.
     */
    if (loadingMore && Array.isArray(data.value) && Array.isArray(responseData)) {
      data.value = [...data.value, ...responseData];
    } else if (!loadingMore) {
      data.value = responseData;
    }

    moreParams.value = response.more || null;
    count.value = response.count || null;
  };

  const fetchData = async (...args) => {
    loading.value = true;
    loadingMore.value = false; // Reset loading more state
    error.value = null;
    _fetchCount.value += 1;
    const currentFetchCount = _fetchCount.value;

    // If the fetch count has changed, it means that a new fetch has been triggered
    // and this fetch is no longer relevant
    const newFetchHasStarted = () => currentFetchCount !== _fetchCount.value;

    try {
      const response = await fetchMethod(...args);
      if (newFetchHasStarted()) {
        return;
      }
      _setData(response);
    } catch (err) {
      if (newFetchHasStarted()) {
        return;
      }
      error.value = err;
    }

    loading.value = false;
  };

  const fetchMore = async (...args) => {
    if (!moreParams.value || !fetchMoreMethod || loadingMore.value || loading.value) {
      return;
    }

    loadingMore.value = true;
    error.value = null;
    const currentFetchCount = _fetchCount.value;

    // If the fetch count or fetch more count has changed, it means that a new fetch has been
    // triggered and this fetch is no longer relevant
    const newFetchHasStarted = () => currentFetchCount !== _fetchCount.value;

    try {
      const response = await fetchMoreMethod(moreParams.value, ...args);
      if (newFetchHasStarted()) {
        return;
      }
      _setData(response, true);
    } catch (err) {
      if (newFetchHasStarted()) {
        return;
      }
      error.value = err;
    }

    loadingMore.value = false;
  };

  return {
    data,
    error,
    count,
    loading,
    hasMore,
    loadingMore,
    fetchData,
    fetchMore,
  };
}
