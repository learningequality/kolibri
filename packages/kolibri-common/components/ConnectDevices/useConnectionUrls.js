import { computed, ref } from 'vue';
import { useTimeoutPoll } from '@vueuse/core';
import ConnectionUrlsResource from 'kolibri-common/apiResources/ConnectionUrlsResource';

const POLL_INTERVAL = 30000;

export default function useConnectionUrls() {
  const { data: urls, error, fetchData } = ConnectionUrlsResource.useList();

  const fetchFailed = ref(false);

  async function poll() {
    await fetchData();
    fetchFailed.value = Boolean(error.value);
  }

  useTimeoutPoll(poll, POLL_INTERVAL, { immediate: true });

  const hasFetched = computed(() => urls.value !== null);

  const hostnameUrls = computed(() =>
    (urls.value || []).filter(entry => entry.is_local_hostname).map(entry => entry.url),
  );

  const ipUrls = computed(() =>
    (urls.value || []).filter(entry => !entry.is_local_hostname).map(entry => entry.url),
  );

  const hasUrls = computed(() => Boolean(urls.value?.length));

  const qrUrl = computed(
    () =>
      ipUrls.value.find(url => new URL(url).hostname === window.location.hostname) ||
      ipUrls.value[0],
  );

  return {
    hasFetched,
    fetchFailed,
    hasUrls,
    hostnameUrls,
    ipUrls,
    qrUrl,
  };
}
