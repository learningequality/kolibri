import uniqBy from 'lodash/uniqBy';
import { ref, provide, inject } from '@vue/composition-api';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';

export default function useResourceSelection() {
  const loading = ref(false);
  const bookmarks = ref([]);
  const channels = ref([]);
  const selectedResources = ref([]);

  const loadBookmarks = async () => {
    const data = await ContentNodeResource.fetchBookmarks({
      params: { limit: 25, available: true },
    });

    bookmarks.value = data.results || [];
  };

  const loadChannels = async () => {
    const response = await ChannelResource.fetchCollection({
      getParams: {
        available: true,
      },
    });
    channels.value = response;
  };

  const loadData = async () => {
    loading.value = true;
    await Promise.all([loadBookmarks(), loadChannels()]);
    loading.value = false;
  };

  loadData();

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

  provide('channels', channels);
  provide('bookmarks', bookmarks);
  provide('selectedResources', selectedResources);
  provide('selectResources', selectResources);
  provide('deselectResources', deselectResources);

  return {
    loading,
  };
}

export function injectResourceSelection() {
  const channels = inject('channels');
  const bookmarks = inject('bookmarks');
  const selectedResources = inject('selectedResources');
  const selectResources = inject('selectResources');
  const deselectResources = inject('deselectResources');

  return {
    channels,
    bookmarks,
    selectResources,
    deselectResources,
    selectedResources,
  };
}
