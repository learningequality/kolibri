/**
 * A composable function containing logic related to download requests
 */

import Vue, { getCurrentInstance, onBeforeUnmount, reactive, ref } from 'vue';
import ContentRequestResource from 'kolibri-common/apiResources/ContentRequestResource';
import { createTranslator } from 'kolibri/utils/i18n';
import { get, set } from '@vueuse/core';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import urls from 'kolibri/urls';
import client from 'kolibri/client';
import useUser from 'kolibri/composables/useUser';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { currentDeviceData } from '../composables/useDevices';

const downloadRequestsTranslator = createTranslator('DownloadRequests', {
  downloadStartedLabel: {
    message: 'Download requested',
    context: 'A message shown to indicate that a download request has been created',
  },
  goToDownloadsPage: {
    message: 'Go to downloads',
    context: 'A label for navigation to the download management page',
  },
  resourceRemoved: {
    message: 'Resource removed from my library',
    context: 'A message shown when a user has removed a resource from their library',
  },
  downloadComplete: {
    message: 'Download complete',
    context: 'A message shown to indicate that a download request has been completed',
  },
});

// The reactive is defined in the outer scope so it can be used as a shared store
const downloadRequestMap = reactive({});
const loading = ref(true);
const availableSpace = ref(0);

export default function useDownloadRequests(store) {
  store = store || getCurrentInstance().proxy.$store;

  const { instanceId } = currentDeviceData(store);

  function fetchUserDownloadRequests(params) {
    return ContentRequestResource.list(params).then(downloadRequests => {
      if (downloadRequests.results) {
        downloadRequests = downloadRequests.results;
      }
      for (const obj of downloadRequests) {
        set(downloadRequestMap, obj.contentnode_id, obj);
      }
      store.dispatch('notLoading');
      set(loading, false);
      return downloadRequests;
    });
  }

  const defaultPollingInterval = 30000; // Default interval of 30 seconds

  const calculatePollingInterval = () => {
    return Object.values(downloadRequestMap).reduce((interval, download) => {
      let pollingInterval = defaultPollingInterval;
      if (download.status === 'PENDING' || download.status === 'FAILED') {
        pollingInterval = 5000; // Poll every 5 seconds
      } else if (download.status === 'IN_PROGRESS') {
        pollingInterval = 1000; // Poll every 1 second
      }
      return Math.min(interval, pollingInterval);
    }, defaultPollingInterval);
  };

  let poller;

  const pollingParams = ref({});

  const pollRequests = () => {
    poller = setTimeout(() => {
      fetchUserDownloadRequests(get(pollingParams)).then(() => {
        pollRequests();
      });
    }, calculatePollingInterval());
  };

  const clearPolling = () => {
    clearTimeout(poller);
  };

  const restartPolling = () => {
    if (poller) {
      clearPolling();
      pollRequests();
    }
  };

  const pollUserDownloadRequests = params => {
    set(pollingParams, params);
    fetchUserDownloadRequests(get(pollingParams)).then(() => {
      pollRequests();
    });
  };

  function fetchAvailableFreespace() {
    const loading = ref(true);
    const freespace = 0;
    client({
      url: `${urls['kolibri:core:freespace']()}`,
      params: { path: 'Content' },
    })
      .then(resp => {
        set(availableSpace, resp.data.freespace);
        set(loading, false);
      })
      .catch(() => -1);
    return freespace;
  }

  function navigateToDownloads() {
    redirectBrowser(urls['kolibri:kolibri.plugins.learn:my_downloads']());
  }

  const { createSnackbar } = useSnackbar();

  function addDownloadRequest(contentNode) {
    const metadata = {
      title: contentNode.title,
      file_size: contentNode.files.reduce((size, f) => size + f.file_size, 0),
      learning_activities: contentNode.learning_activities,
    };
    const data = {
      contentnode_id: contentNode.id,
      metadata,
      source_id: useUser().currentUserId.value,
      source_instance_id: get(instanceId),
      reason: 'USER_INITIATED',
      facility: store.getters.currentFacilityId,
      status: 'PENDING',
      date_added: new Date(),
    };
    set(downloadRequestMap, contentNode.id, data);
    ContentRequestResource.create(data).then(downloadRequest => {
      set(downloadRequestMap, downloadRequest.contentnode_id, downloadRequest);
      restartPolling();
    });

    createSnackbar({
      text: downloadRequestsTranslator.$tr('downloadStartedLabel'),
      actionText: downloadRequestsTranslator.$tr('goToDownloadsPage'),
      actionCallback: navigateToDownloads,
      backdrop: false,
      forceReuse: true,
      autoDismiss: true,
    });
    return Promise.resolve();
  }

  function showCompletedDownloadSnackbar() {
    createSnackbar({
      text: downloadRequestsTranslator.$tr('downloadComplete'),
      actionText: downloadRequestsTranslator.$tr('goToDownloadsPage'),
      actionCallback: navigateToDownloads,
      backdrop: false,
      forceReuse: true,
      autoDismiss: true,
    });
  }

  function removeDownloadRequest(contentNodeId) {
    const contentRequest = downloadRequestMap[contentNodeId];
    if (!contentRequest) {
      return Promise.resolve();
    }
    ContentRequestResource.deleteModel({
      id: contentRequest.id,
    });
    Vue.delete(downloadRequestMap, contentRequest.contentnode_id);
    createSnackbar({
      text: downloadRequestsTranslator.$tr('resourceRemoved'),
      backdrop: false,
      forceReuse: true,
      autoDismiss: true,
    });
    return Promise.resolve();
  }

  onBeforeUnmount(() => {
    clearPolling();
  });

  return {
    fetchUserDownloadRequests,
    pollUserDownloadRequests,
    fetchAvailableFreespace,
    availableSpace,
    downloadRequestMap,
    addDownloadRequest,
    loading,
    removeDownloadRequest,
    downloadRequestsTranslator,
    showCompletedDownloadSnackbar,
  };
}
