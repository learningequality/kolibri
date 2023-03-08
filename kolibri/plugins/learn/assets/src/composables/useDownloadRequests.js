/**
 * A composable function containing logic related to download requests
 */

import { getCurrentInstance, reactive, ref } from 'kolibri.lib.vueCompositionApi';
import Vue from 'kolibri.lib.vue';
import { createTranslator } from 'kolibri.utils.i18n';
import { set } from '@vueuse/core';

const translator = createTranslator('DownloadRequests', {
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

export default function useDownloadRequests(store) {
  store = store || getCurrentInstance().proxy.$store;
  function fetchUserDownloadRequests() {
    const loading = ref(true);
    const dummyDownloadRequests = [
      {
        user_id: store.getters.currentUserId,
        reason: 'USER_INITIATED',
        facility_id: store.getters.currentFacilityId,
        status: 'QUEUED',
        date_added: new Date(),
        resource_metadata: {
          title: 'Intro to addition',
          file_size: 1113580,
          learning_activities: ['UD5UGM0z'],
        },
        node_id: '2ea9bda8703241be89b5b9fd87f88815',
      },
    ];
    for (const req of dummyDownloadRequests) {
      set(downloadRequestMap, req.node_id, req);
    }
    setTimeout(() => set(loading, false), 5000);
    return loading;
  }

  function navigateToDownloads() {}

  function addDownloadRequest(content) {
    const resource_metadata = {
      title: content.title,
      file_size: content.files.reduce((size, f) => size + f.file_size, 0),
      learning_activities: content.learning_activities,
    };
    const requestData = {
      node_id: content.id,
      resource_metadata,
      user_id: store.getters.currentUserId,
      reason: 'USER_INITIATED',
      facility_id: store.getters.currentFacilityId,
      status: 'QUEUED',
      date_added: new Date(),
    };
    console.log(requestData);
    set(downloadRequestMap, requestData.node_id, requestData);
    store.commit('CORE_CREATE_SNACKBAR', {
      text: translator.$tr('downloadStartedLabel'),
      actionText: translator.$tr('goToDownloadsPage'),
      actionCallback: navigateToDownloads,
      backdrop: false,
      forceReuse: true,
      autoDismiss: true,
    });
    return Promise.resolve();
  }

  function removeDownloadRequest(content) {
    console.log(`requested removal of ${content.id}`);
    Vue.delete(downloadRequestMap, content.id);
    return Promise.resolve();
  }

  return {
    fetchUserDownloadRequests,
    downloadRequestMap,
    addDownloadRequest,
    removeDownloadRequest,
  };
}
