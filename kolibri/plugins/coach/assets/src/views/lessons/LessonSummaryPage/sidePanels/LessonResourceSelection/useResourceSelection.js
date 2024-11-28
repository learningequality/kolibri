import uniqBy from 'lodash/uniqBy';
import { ref, provide, inject, computed } from '@vue/composition-api';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';
import useFetch from './useFetch';

export default function useResourceSelection() {
  const selectedResources = ref([]);

  const bookmarksFetch = useFetch({
    fetchMethod: () =>
      ContentNodeResource.fetchBookmarks({
        params: { limit: 25, available: true },
      }),
    fetchMoreMethod: more =>
      ContentNodeResource.fetchBookmarks({
        params: more,
      }),
    dataKey: 'results',
    countKey: 'count',
    moreKey: 'more',
  });

  const channelsFetch = useFetch({
    fetchMethod: () =>
      ChannelResource.fetchCollection({
        getParams: {
          available: true,
        },
      }),
  });

  const loading = computed(() => {
    const { loading: bookmarksLoading } = bookmarksFetch;
    const { loading: channelsLoading } = channelsFetch;

    return bookmarksLoading.value || channelsLoading.value;
  });

  const fetchInitialData = async () => {
    bookmarksFetch.fetchData();
    channelsFetch.fetchData();
  };

  fetchInitialData();

  const selectResources = (resources = []) => {
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
    selectedResources.value = selectedResources.value.filter(res => {
      return !resources.find(unselectedResource => unselectedResource.id === res.id);
    });
  };

  provide('channelsFetch', channelsFetch);
  provide('bookmarksFetch', bookmarksFetch);
  provide('selectedResources', selectedResources);
  provide('selectResources', selectResources);
  provide('deselectResources', deselectResources);

  return {
    loading,
  };
}

export function injectResourceSelection() {
  const channelsFetch = inject('channelsFetch');
  const bookmarksFetch = inject('bookmarksFetch');
  const selectedResources = inject('selectedResources');
  const selectResources = inject('selectResources');
  const deselectResources = inject('deselectResources');

  return {
    channelsFetch,
    bookmarksFetch,
    selectResources,
    deselectResources,
    selectedResources,
  };
}
