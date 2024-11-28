import get from 'lodash/get';
import { ref, computed } from '@vue/composition-api';
import { ViewMoreButtonStates } from '../../../../../constants';

export default function useFetch(options) {
  const { fetchMethod, fetchMoreMethod, dataKey, moreKey, countKey } = options || {};

  const loading = ref(false);
  const data = ref(null);
  const count = ref(null);
  const error = ref(null);
  const more = ref(null);
  const loadingMore = ref(false);

  const moreState = computed(() => {
    if (loadingMore.value) {
      return ViewMoreButtonStates.LOADING;
    }
    if (more.value) {
      return ViewMoreButtonStates.HAS_MORE;
    }
    return ViewMoreButtonStates.NO_MORE;
  });

  const _setFromKeys = response => {
    let responseData;
    if (!dataKey) {
      responseData = response;
    } else {
      responseData = get(response, dataKey);
    }

    if (loadingMore.value) {
      data.value = [...data.value, ...responseData];
    } else {
      data.value = responseData;
    }

    if (moreKey) {
      more.value = get(response, moreKey) || null;
    }

    if (countKey) {
      count.value = get(response, countKey);
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
      _setFromKeys(response);
    } catch (err) {
      error.value = err;
    }

    loadingMore.value = false;
  };

  return {
    data,
    count,
    error,
    loading,
    moreState,
    fetchData,
    fetchMore,
  };
}
