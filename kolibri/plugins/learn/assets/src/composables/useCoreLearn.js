import { ref } from 'kolibri.lib.vueCompositionApi';
import { set } from '@vueuse/core';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

export const inClasses = ref(false);
export const canDownload = ref(true);

export function prepareLearnApp() {
  return client({ url: urls['kolibri:kolibri.plugins.learn:state']() }).then(response => {
    set(inClasses, response.data.in_classes);
    set(canDownload, response.data.can_download_content);
  });
}

export default function useCoreLearn() {
  return {
    inClasses,
    canDownload,
  };
}
