/**
 * A composable function containing logic related to download requests
 */

import { getCurrentInstance, reactive, ref } from 'kolibri.lib.vueCompositionApi';
import { ContentDownloadRequestResource } from 'kolibri.resources';
import Vue from 'kolibri.lib.vue';
import { createTranslator } from 'kolibri.utils.i18n';
import { set } from '@vueuse/core';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import urls from 'kolibri.urls';
import client from 'kolibri.client';

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
const downloadRequestMap = reactive({
  downloads: {},
  totalPageNumber: 0,
  totalDownloads: 0,
  totalStorage: 0,
});

export default function useDownloadRequests(store) {
  store = store || getCurrentInstance().proxy.$store;
  function fetchUserDownloadRequests(params) {
    const { page, pageSize } = params;
    const loading = ref(true);
    let storage = 0;
    return ContentDownloadRequestResource.list(params).then(downloadRequests => {
      set(downloadRequestMap, 'downloads', {});
      for (let i = 0; i < pageSize; i++) {
        const index = (page - 1) * pageSize + i;
        if (index >= downloadRequests.length) {
          break;
        }
        storage += downloadRequests[index].metadata
          ? downloadRequests[index].metadata.file_size
          : storage;
        set(downloadRequestMap.downloads, downloadRequests[index].id, downloadRequests[index]);
      }
      set(downloadRequestMap, 'totalPageNumber', Math.ceil(downloadRequests.length / pageSize));
      set(downloadRequestMap, 'totalDownloads', downloadRequests.length);
      set(downloadRequestMap, 'totalStorage', storage);
      set(loading, false);
    }, 500);
  }

  function fetchDownloadsStorageInfo() {
    const loading = ref(true);
    const storageInfo = ref(null);
    let freespace = 0;
    client({
      url: `${urls['kolibri:core:freespace']()}`,
      params: { path: 'Content' },
    })
      .then(resp => (freespace = resp.data.freespace))
      .catch(() => -1);
    setTimeout(() => {
      set(storageInfo, freespace);
      set(loading, false);
    }, 600);
    return { loading, storageInfo };
  }

  // add the page route here
  function navigateToDownloads() {
    redirectBrowser(urls['kolibri:kolibri.plugins.learn:my_downloads']());
  }

  function addDownloadRequest(content) {
    const metadata = {
      title: content.title,
      file_size: content.files.reduce((size, f) => size + f.file_size, 0),
      learning_activities: content.learning_activities,
    };
    const data = {
      contentnode_id: content.id,
      metadata,
      source_id: store.getters.currentUserId,
      reason: 'UserInitiated',
      facility: store.getters.currentFacilityId,
      status: 'Pending',
      date_added: new Date(),
    };
    ContentDownloadRequestResource.create(data).then(downloadRequest => {
      set(downloadRequestMap, 'downloads', {});
      set(downloadRequestMap.downloads, downloadRequest.node_id, downloadRequest);
    });
    // TODO: Remove and replace by real progress implementation
    // as soon as backend can provide it. `complete` is just a mock field
    // that may not reflect precisely they way backend will inform fronted
    // about progress. Also see `isDownloadingByLearner` and `isDownloadedByLearner`.
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

  function removeDownloadRequest(content) {
    ContentDownloadRequestResource.deleteModel({
      id: content.id,
      contentnode_id: content.contentnode_id,
    })
      .then(Vue.delete(downloadRequestMap.downloads, content.id))
      .then(
        set(downloadRequestMap, 'totalDownloads', Object.keys(downloadRequestMap.downloads).length)
      );
    return Promise.resolve();
  }

  function removeDownloadsRequest(contentList) {
    contentList.forEach(content => {
      Vue.delete(downloadRequestMap.downloads, content.id);
    });
    return Promise.resolve();
  }

  function isDownloadingByLearner(content) {
    if (!content || !content.id) {
      return false;
    }
    const downloadRequest = downloadRequestMap.downloads[this.content.id];
    // TODO: Get real progress from `downloadRequest` as soon as backend is ready
    // and determine whether the content is downloading according to that instead
    // of using the `complete` mock.
    // `isDownloadingByLearner` is expected to be reactive by components that use it
    // and return accurate information as the progress changes. After updating to real
    // progress, check that related logic in components that use `isDownloadingByLearner`
    // still makes sense and all features are working as expected.
    return Boolean(downloadRequest && !downloadRequest.complete);
  }

  // Note that backend filters out download requests that correspond to content that was
  // removed after being downloaded, therefore the presence of a completed download request
  // means that the content is downloaded on the device.
  function isDownloadedByLearner(content) {
    if (!content || !content.id) {
      return false;
    }
    const downloadRequest = downloadRequestMap.downloads[this.content.id];
    // TODO: Get real progress from `downloadRequest` as soon as backend is ready
    // and determine whether the content finished downloading according to that instead
    // of using the `complete` mock.
    // `isDownloadedByLearner` is expected to be reactive by components that use it
    // and return accurate information as the progress changes. After updating to real
    // progress, check that related logic in components that use `isDownloadedByLearner`
    // still makes sense and all features are working as expected.
    return Boolean(downloadRequest && downloadRequest.complete);
  }

  return {
    fetchUserDownloadRequests,
    fetchDownloadsStorageInfo,
    downloadRequestMap,
    addDownloadRequest,
    removeDownloadRequest,
    removeDownloadsRequest,
    downloadRequestsTranslator,
    isDownloadingByLearner,
    isDownloadedByLearner,
  };
}
