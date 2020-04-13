import client from 'kolibri.client';
import urls from 'kolibri.urls';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import bytesForHumans from 'kolibri.utils.bytesForHumans';
import { isEmbeddedWebView } from 'kolibri.utils.browserInfo';

/* Function to fetch device info from the backend
 * and resolve validated data
 */
export function getDeviceInfo() {
  const requests = [
    client({ path: urls['kolibri:core:deviceinfo']() }),
    client({ path: urls['kolibri:core:devicename']() }),
  ];
  return Promise.all(requests).then(([infoResponse, nameResponse]) => {
    const data = infoResponse.entity;
    data.server_time = new Date(data.server_time);
    data.free_space = data.content_storage_free_space;
    data.content_storage_free_space = bytesForHumans(data.content_storage_free_space);
    data.device_name = nameResponse.entity.name;

    if (infoResponse.headers.Server.includes('0.0.0.0')) {
      if (isEmbeddedWebView) {
        data.server_type = 'Kolibri app server';
      } else {
        data.server_type = 'Kolibri internal server';
      }
    } else data.server_type = infoResponse.headers.Server;

    return data;
  });
}

/**
 * Action to hydrate device-info page.
 *
 * @param {Store} store
 * @returns Promise<void>
 */
export function showDeviceInfoPage(store) {
  if (store.getters.canManageContent) {
    const promises = ConditionalPromise.all([getDeviceInfo()]).only(samePageCheckGenerator(store));
    return promises
      .then(function onSuccess([deviceInfo]) {
        store.commit('deviceInfo/SET_STATE', {
          deviceInfo,
        });
      })
      .catch(function onFailure(error) {
        store.dispatch('handleApiError', error);
      });
  }
  return Promise.resolve();
}
