import get from 'lodash/get';
import { ref, computed } from 'vue';

/**
 * A composable for managing fetch operations with optional methods for additional data fetching.
 *
 * @param {Object} options **Required** Configuration options for the fetch operation.
 * @param {(...args) => Promise<any>} options.fetchMethod **Required** Function to fetch the
 * initial data. Should return a Promise resolving to the fetched data.
 *
 * Example:
 * ```js
 * const fetchMethod = () => ContentNodeResource.fetchBookmarks({
 *   params: { limit: 25, available: true, },
 * })
 *
 *
 * @param {string} [options.dataKey] The key in the response object where the main data is located.
 * * You can use `lodash.get`-compatible keys to access nested objects (e.g., "data.user.details").
 * * If `dataKey` is left `undefined`, the entire response object will be treated as the main data.
 *
 * Example:
 * ```js
 * // Suppose the response object looks like this:
 * const response = {
 *   status: "success",
 *   payload: { id: 42, name: "Jane Doe" }
 * };
 *
 * // By specifying `dataKey`, you tell the composable where to find the main data:
 * const { data } = useFetch({ dataKey: "payload" });
 * console.log(data); // Outputs: { id: 42, name: "Jane Doe" }
 * ```
 *
 *
 * @param {string} [options.moreKey] The key in the response object where the
 * "more" object is located.
 * * This is the object that will be passed as the first argument to the `fetchMoreMethod` param.
 * * You can use `lodash.get`-compatible keys to access nested objects (e.g., "data.user.details").
 *
 * Example:
 * ```js
 * // Suppose the response object looks like this:
 * const response = {
 *   results: [...],
 *   more: { page: 2 }
 * };
 *
 * // By specifying `moreKey`, you tell the composable where to find the more object
 * // to fetch additional data:
 * useFetch({ moreKey: "more" });
 * ```
 *
 * @param {string} [options.countKey] The key in the response object where the count of
 * the data is located. Count is the total number of items.
 * * You can use `lodash.get`-compatible keys to access nested objects (e.g., "data.count").
 *
 * Example:
 * ```js
 * // Suppose the response object looks like this:
 * const response = {
 *   results: [...],
 *   count: 100
 * };
 *
 * // By specifying `countKey`, you tell the composable where to find the count of the data:
 * const { count } = useFetch({ countKey: "count" });
 * console.log(count); // Outputs: 100
 * ```
 *
 * @param {(more, ...args) => Promise<any>} [options.fetchMoreMethod] Function to fetch more data.
 * * This function receives a "more" object as its first argument. This "more" object is specified
 *   by the `moreKey` param.
 * * Should return a Promise resolving to the additional data.
 * * FetchMore just works if the fetched data is an array
 *
 * Example:
 *
 * ```js
 * const fetchMoreMethod = (more) => ContentNodeResource.fetchBookmarks({
 *  params: more
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
  const { fetchMethod, fetchMoreMethod, dataKey, moreKey, countKey } = options || {};

  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);
  const more = ref(null);
  const count = ref(null);
  const loadingMore = ref(false);

  const hasMore = computed(() => more.value != null);

  const _setFromKeys = (response, loadingMore) => {
    let responseData;
    if (!dataKey) {
      responseData = response;
    } else {
      responseData = get(response, dataKey);
    }

    /**
     * For now, loading more just  works if the data is an array.
     */
    if (loadingMore && Array.isArray(data.value) && Array.isArray(responseData)) {
      data.value = [...data.value, ...responseData];
    } else if (!loadingMore) {
      data.value = responseData;
    }

    if (moreKey) {
      more.value = get(response, moreKey) || null;
    }

    if (countKey) {
      count.value = get(response, countKey) || null;
    }
  };

  const fetchData = async (...args) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchMethod(...args);
      _setFromKeys(response);
    } catch (err) {
      error.value = err;
    }

    loading.value = false;
  };

  const fetchMore = async (...args) => {
    if (!more.value || !fetchMoreMethod) {
      return;
    }

    loadingMore.value = true;
    error.value = null;

    try {
      const response = await fetchMoreMethod(more.value, ...args);
      _setFromKeys(response, loadingMore.value);
    } catch (err) {
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
