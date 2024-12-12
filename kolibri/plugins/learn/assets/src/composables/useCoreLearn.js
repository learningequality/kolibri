import { ref } from 'vue';
import { set } from '@vueuse/core';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import plugin_data from 'kolibri-plugin-data';

/**
 * Whether the user is in any classes
 * @type {Ref<boolean>}
 */
export const inClasses = ref(false);
/**
 * Whether the user can download content externally from Kolibri within the learn app
 * @type {Ref<boolean>}
 */
export const canDownloadExternally = ref(true);

/**
 * Whether learners can queue content downloads (to 'My Downloads')
 * @type {Ref<boolean>}
 */
export const canAddDownloads = ref(false);

export function prepareLearnApp() {
  set(canAddDownloads, plugin_data.allowLearnerDownloads);
  return client({ url: urls['kolibri:kolibri.plugins.learn:state']() }).then(response => {
    set(inClasses, response.data.in_classes);
    set(canDownloadExternally, response.data.can_download_externally);
  });
}

/**
 * @return {{
 *   canDownloadExternally: Ref<boolean>, canAddDownloads: Ref<boolean>, inClasses: Ref<boolean>
 * }}
 */
export default function useCoreLearn() {
  return {
    inClasses,
    canAddDownloads,
    canDownloadExternally,
  };
}
