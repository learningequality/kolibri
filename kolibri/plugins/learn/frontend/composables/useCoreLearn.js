import { ref } from 'vue';
import { set } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import plugin_data from 'kolibri-plugin-data';

export const inClasses = ref(false);
export const canDownloadExternally = ref(true);

export const canAddDownloads = ref(false);

export function prepareLearnApp() {
  set(canAddDownloads, plugin_data.allowLearnerDownloads);
  return client({ url: urls['kolibri:kolibri.plugins.learn:state']() }).then(response => {
    set(inClasses, response.data.in_classes);
    set(canDownloadExternally, response.data.can_download_externally);
  });
}

export default function useCoreLearn() {
  return {
    inClasses,
    canAddDownloads,
    canDownloadExternally,
  };
}
