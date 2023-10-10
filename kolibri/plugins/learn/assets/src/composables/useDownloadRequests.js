/**
 * A composable function containing logic related to download requests
 */

import { getCurrentInstance, reactive, ref } from 'kolibri.lib.vueCompositionApi';
import { ContentRequestResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { get, set } from '@vueuse/core';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import urls from 'kolibri.urls';
import client from 'kolibri.client';
import Vue from 'kolibri.lib.vue';
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
});

// The reactive is defined in the outer scope so it can be used as a shared store
const downloadRequestMap = reactive({});
const loading = ref(true);
const availableSpace = ref(0);

export default function useDownloadRequests(store) {
  store = store || getCurrentInstance().proxy.$store;

  const { instanceId } = currentDeviceData(store);

  function fetchUserDownloadRequests(params) {
    return ContentRequestResource.list(params)
      .then(downloadRequests => {
        if (downloadRequests.results) {
          downloadRequests = downloadRequests.results;
        }
        for (const obj of downloadRequests) {
          set(downloadRequestMap, obj.contentnode_id, obj);
        }
        set(loading, false);
        return downloadRequests;
      })
      .then(downloadRequests => {
        store.dispatch('notLoading');
        return downloadRequests;
      });
  }

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

  function addDownloadRequest(contentNode) {
    const metadata = {
      title: contentNode.title,
      file_size: contentNode.files.reduce((size, f) => size + f.file_size, 0),
      learning_activities: contentNode.learning_activities,
    };
    const data = {
      contentnode_id: contentNode.id,
      metadata,
      source_id: store.getters.currentUserId,
      source_instance_id: get(instanceId),
      reason: 'UserInitiated',
      facility: store.getters.currentFacilityId,
      status: 'Pending',
      date_added: new Date(),
    };
    ContentRequestResource.create(data).then(downloadRequest => {
      set(downloadRequestMap, downloadRequest.contentnode_id, downloadRequest);
    });

    store.commit('CORE_CREATE_SNACKBAR', {
      text: downloadRequestsTranslator.$tr('downloadStartedLabel'),
      actionText: downloadRequestsTranslator.$tr('goToDownloadsPage'),
      actionCallback: navigateToDownloads,
      backdrop: false,
      forceReuse: true,
      autoDismiss: true,
    });
    return Promise.resolve();
  }

  function removeDownloadRequest(contentRequest) {
    ContentRequestResource.deleteModel({
      id: contentRequest.id,
    });
    Vue.delete(downloadRequestMap, contentRequest.contentnode_id);
    return Promise.resolve();
  }

  function isDownloadingByLearner(content) {
    if (!content || !content.id) {
      return false;
    }
    const downloadRequest = downloadRequestMap[content.id];
    return Boolean(downloadRequest && !downloadRequest.status === 'COMPLETED');
  }

  function isDownloadedByLearner(content) {
    if (!content || !content.id) {
      return false;
    }
    const downloadRequest = downloadRequestMap[content.id];
    return Boolean(downloadRequest && downloadRequest.status === 'COMPLETED');
  }

  return {
    fetchUserDownloadRequests,
    fetchAvailableFreespace,
    availableSpace,
    downloadRequestMap,
    addDownloadRequest,
    loading,
    removeDownloadRequest,
    downloadRequestsTranslator,
    isDownloadingByLearner,
    isDownloadedByLearner,
  };
}
