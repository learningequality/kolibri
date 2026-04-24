import { ref, computed } from 'vue';

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
