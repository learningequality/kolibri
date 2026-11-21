import { computed, ref } from 'vue';
import { useTimeoutPoll } from '@vueuse/core';
import useFetch from 'kolibri/composables/useFetch';
import heartbeat from 'kolibri/heartbeat';
import urls from 'kolibri/urls';
import clientFactory from 'kolibri/utils/baseClient';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import HttpPortResource from 'kolibri-common/apiResources/HttpPortResource';

const PROBE_INTERVAL = 1000;

export const BROWSER_PORT_MISMATCH = 'BROWSER_PORT_MISMATCH';

const probeClient = clientFactory();

const DEFAULT_PORTS = { 'http:': 80, 'https:': 443 };

function browserPort() {
  const { port, protocol } = window.location;
  return port ? Number(port) : DEFAULT_PORTS[protocol];
}

function withPort(url, port) {
  const moved = new URL(url, window.location.href);
  moved.port = String(port);
  return moved.href;
}

export default function useHttpPort() {
  const { data, error, fetchData } = useFetch({ fetchMethod: () => HttpPortResource.list() });
  fetchData();

  const currentPort = computed(() => data.value?.port ?? null);
  const readonlyReason = computed(() => {
    if (!data.value) {
      return null;
    }
    if (data.value.readonly_reason) {
      return data.value.readonly_reason;
    }
    return browserPort() === data.value.port ? null : BROWSER_PORT_MISMATCH;
  });
  const saving = ref(false);
  const restartingPort = ref(null);
  const failure = ref(null);

  async function probe() {
    try {
      await probeClient({
        url: withPort(urls.static('assets/favicons/logo.ico'), restartingPort.value),
        // WhiteNoise serves this file with `Cache-Control: max-age=120, public`.
        params: { t: Date.now() },
      });
    } catch {
      return;
    }
    pause();
    redirectBrowser(withPort(window.location.href, restartingPort.value));
  }

  const { pause, resume } = useTimeoutPoll(probe, PROBE_INTERVAL);

  async function changePort(port) {
    saving.value = true;
    failure.value = null;
    try {
      await HttpPortResource.create({ port });
    } catch (error) {
      const [entry] = Array.isArray(error.response?.data) ? error.response.data : [];
      failure.value = {
        id: entry?.id,
        status: error.response?.status,
        port,
        detail: entry?.metadata?.message ?? '',
      };
      return false;
    } finally {
      saving.value = false;
    }
    heartbeat.stopPolling();
    restartingPort.value = port;
    resume();
    return true;
  }

  return {
    currentPort,
    fetchFailed: computed(() => Boolean(error.value)),
    readonlyReason,
    saving,
    restartingPort,
    failure,
    changePort,
  };
}
