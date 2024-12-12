import get from 'lodash/get';
import { ref, computed } from '@vue/composition-api';
import { ViewMoreButtonStates } from '../constants';

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
 *   payload: [...],
 *   more: { page: 2 }
 * };
 *
 * // By specifying `moreKey`, you tell the composable where to find the more object
 * // to fetch additional data:
 * useFetch({ moreKey: "more" });
 * ```
 *
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
 * @param {Object.<string, string>} [options.additionalDataKeys] An object that maps additional
 * data keys for the response object.
 * * In the `{ key: value }` pair:
 *   - The `key` will be used as the property name in the returned `additionalData` object.
 *   - The `value` specifies the key in the response object from which the data will be retrieved.
 *
 * Example:
 * ```js
 * const additionalDataKeys = {
 *   userId: "user_id", // The `userId` property in `additionalData` will map to `response.user_id`
 *   userName: "name" // The `userName` property in `additionalData` will map to `response.name`
 * };
 *
 * const { additionalData } = useFetch({ additionalDataKeys });
 * console.log(additionalData.userId);  // Outputs the value of `response.user_id`
 * console.log(additionalData.userName); // Outputs the value of `response.name`
 * ```
 *
 *
 * @typedef {Object} FetchObject
 * @property {any} data The main fetched data.
 * @property {Object} error Error object if a fetch data failed.
 * @property {boolean} loading Data loading state. This loading doesnt reflect the loading when
 *   fetching more data. refer to moreState for that.
 * @property {string} moreState State of the fetch more data, it could be LOADING, HAS_MORE,
 *   NO_MORE or ERROR.
 * @property {Object<string, any>} additionalData Extra data specified by `additionalDataKeys`.
 * @property {(...args) => Promise<void>} fetchData A method to manually trigger the main fetch.
 * @property {(...args) => Promise<void>} fetchMore A method to manually trigger fetch more data.
 *
 * @returns {FetchObject} An object with properties and methods for managing the fetch process.
 */
export default function useFetch(options) {
  const { fetchMethod, fetchMoreMethod, dataKey, moreKey, additionalDataKeys } = options || {};

  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);
  const more = ref(null);
  const loadingMore = ref(false);
  const additionalData = ref(null);

  const moreState = computed(() => {
    if (loadingMore.value) {
      return ViewMoreButtonStates.LOADING;
    }
    if (more.value) {
      return ViewMoreButtonStates.HAS_MORE;
    }
    return ViewMoreButtonStates.NO_MORE;
  });

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

    if (additionalDataKeys) {
      const newAdditionalData = {};
      // The `key` will be used as the property name in the returned `additionalData` object.
      // The `value` specifies the key in the response object from which the data will be get.
      for (const [key, value] of Object.entries(additionalDataKeys)) {
        // if value is an empty string, that means that no specific data is required,
        // but the whole response object.
        newAdditionalData[key] = value === '' ? response : get(response, value);
      }

      additionalData.value = newAdditionalData;
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
    loading,
    moreState,
    additionalData,
    fetchData,
    fetchMore,
  };
}
