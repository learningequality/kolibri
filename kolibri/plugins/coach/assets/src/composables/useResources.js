import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import { ChannelResource, ContentNodeResource as bookMarkedResource } from 'kolibri.resources';

export function useResources() {
  const resources = ref(null);
  const channels = ref([]);
  const bookmarks = ref([]);

  function fetchChannelResource() {
    ChannelResource.fetchCollection({ params: { has_exercises: true, available: true } }).then(
      response => {
        channels.value = response;
      }
    );
  }

  function fetchBookMarkedResource() {
    bookMarkedResource.fetchBookmarks({ params: { limit: 25, available: true } }).then(data => {
      bookmarks.value = data.results ? data.results : [];
    });
  }

  onMounted(() => {
    fetchChannelResource();
    fetchBookMarkedResource();
  });

  return {
    resources,
    channels,
    bookmarks,
  };
}
