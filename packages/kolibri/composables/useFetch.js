import { ref, computed } from 'vue';

/**
 * @typedef  {object} FetchObject
 * @property {import('vue').Ref<unknown>} data - The main fetched data.
 * @property {import('vue').Ref<?object>} error - Error object if a fetch failed.
 * @property {import('vue').Ref<?number>} count - Count of the fetched data, e.g. the total
 * number of items.
 * @property {import('vue').Ref<?number>} page - Current page number, for page-number paginated
 * endpoints; `null` otherwise.
 * @property {import('vue').Ref<?number>} totalPages - Total number of pages, for page-number
 * paginated endpoints; `null` otherwise.
 * @property {import('vue').Ref<boolean>} loading - Data loading state. This does not reflect
 * the loading state when fetching more data; refer to `loadingMore` for that.
 * @property {import('vue').Ref<boolean>} loadingMore - Loading state when fetching more data.
 * @property {import('vue').ComputedRef<boolean>} hasMore - Whether `fetchMore` can append
 * another page. True only for endpoints that emit a `more` cursor (limit-offset / cursor
 * pagination); for page-number endpoints use `page`/`totalPages` with `fetchData` instead.
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
 * `fetchMethod` should return either the fetched data (a plain array), or a paginated object.
 * Two paginated shapes are understood: `{ results, more, count }` - where `more` is the
 * `moreParams` passed to subsequent `fetchMoreMethod` calls to append the next page - and
 * `{ results, page, total_pages, count }`, surfaced as `page`/`totalPages` for jump-to-page
 * navigation by re-calling `fetchData` with a new page param. `fetchMore` only appends, and
 * only for the `more` shape.
 * @param {object} options - Configuration options for the fetch operation.
 * @param {(...args: unknown[]) => Promise<unknown>} options.fetchMethod - Function to fetch
 * the initial data.
 * @param {(more: unknown, ...args: unknown[]) => Promise<unknown>} [options.fetchMoreMethod]
 * Function to fetch more data, called with the previous response's `more` object.
 * @param {(response: unknown) => void} [options.onSuccess] - Called with the fetched response
 * after a successful `fetchData`, but only once it has passed the staleness check - a fetch
 * superseded by a newer one never invokes it. Not called for `fetchMore`.
 * @returns {FetchObject} An object exposing the fetch state and actions.
 */
export default function useFetch(options) {
  const { fetchMethod, fetchMoreMethod, onSuccess } = options || {};

  const loading = ref(false);
  const data = ref(null);
  const error = ref(null);
  const moreParams = ref(null);
  const count = ref(null);
  const page = ref(null);
  const totalPages = ref(null);
  const loadingMore = ref(false);

  // useFetch metadata to manage synchronization of fetches
  const _fetchCount = ref(0);

  const hasMore = computed(() => moreParams.value != null);

  const _setData = (response, loadingMore) => {
    // A list endpoint returns a plain array when it is not paginated, and a
    // `{ results, more, count }` object when it is. Handle both, so that a fetchMoreMethod
    // can be supplied without knowing up front which shape will come back.
    const responseData = fetchMoreMethod && !Array.isArray(response) ? response.results : response;

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
    // Page-number paginated endpoints emit `page`/`total_pages` instead of a `more` cursor;
    // surface them so consumers can drive jump-to-page navigation via `fetchData`.
    page.value = response.page ?? null;
    totalPages.value = response.total_pages ?? null;
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
      // Runs only after the staleness check, so a superseded fetch cannot fire onSuccess -
      // this is what keeps side effects like a baseline snapshot in sync with `data`.
      if (onSuccess) {
        onSuccess(response);
      }
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
    page,
    totalPages,
    loading,
    hasMore,
    loadingMore,
    fetchData,
    fetchMore,
  };
}
