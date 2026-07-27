import { ref, computed } from 'vue';

/**
 * @typedef  {object} FetchObject
 * @property {import('vue').Ref<unknown>} data - The main fetched data.
 * @property {import('vue').Ref<?object>} error - Error object if a fetch failed.
 * @property {import('vue').Ref<?number>} count - Count of the fetched data, e.g. the total
 * number of items.
 * @property {import('vue').Ref<boolean>} loading - Data loading state. This does not reflect
 * the loading state when fetching more data; refer to `loadingMore` for that.
 * @property {import('vue').Ref<boolean>} loadingMore - Loading state when fetching more data.
 * @property {import('vue').ComputedRef<boolean>} hasMore - Whether there is more data to fetch.
 * @property {(...args: unknown[]) => Promise<void>} fetchData - Manually trigger the main fetch.
 * @property {(...args: unknown[]) => Promise<void>} fetchMore - Manually trigger a fetch of
 * additional data.
 */

/**
 * A composable for managing fetch operations with optional methods for additional data fetching.
 *
 * Example:
 * ```js
 * const { data, loading, error, fetchData } = useFetch({
 * fetchMethod: () => ContentNodeResource.fetchBookmarks(),
 * fetchMoreMethod: moreParams => ContentNodeResource.fetchBookmarks(moreParams),
 * });
 * ```
 *
 * `fetchMethod` should return either the fetched data, or an object of the form
 * `{ results, more, count }` where `results` is the fetched data and `more` is the
 * `moreParams` object passed to subsequent `fetchMoreMethod` calls. `fetchMore` only
 * works when the fetched data is an array.
 * @param {object} options - Configuration options for the fetch operation.
 * @param {(...args: unknown[]) => Promise<unknown>} options.fetchMethod - Function to fetch
 * the initial data.
 * @param {(more: unknown, ...args: unknown[]) => Promise<unknown>} [options.fetchMoreMethod]
 * Function to fetch more data, called with the previous response's `more` object.
 * @returns {FetchObject} An object exposing the fetch state and actions.
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
