import get from 'lodash/get';
import { ref, computed } from '@vue/composition-api';
import { ViewMoreButtonStates } from '../constants';

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

    if (loadingMore) {
      data.value = [...data.value, ...(responseData || [])];
    } else {
      data.value = responseData;
    }

    if (moreKey) {
      more.value = get(response, moreKey) || null;
    }

    if (additionalDataKeys) {
      additionalData.value = Object.entries(additionalDataKeys).reduce((agg, [key, value]) => {
        agg[key] = value === '' ? response : get(response, value);
        return agg;
      }, {});
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
