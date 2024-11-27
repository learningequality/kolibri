import { ref, provide, inject } from '@vue/composition-api';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import ChannelResource from 'kolibri-common/apiResources/ChannelResource';

export default function useResourceSelection() {
  const loading = ref(false);
  const bookmarks = ref([]);
  const channels = ref([]);

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

  provide('bookmarks', bookmarks);
  provide('channels', channels);

  return {
    loading,
  };
}

export function injectResourceSelection() {
  const bookmarks = inject('bookmarks');
  const channels = inject('channels');

  return {
    bookmarks,
    channels,
  };
}
