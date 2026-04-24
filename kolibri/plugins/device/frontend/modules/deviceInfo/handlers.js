import client from 'kolibri/client';
import urls from 'kolibri/urls';
import samePageCheckGenerator from 'kolibri-common/utils/samePageCheckGenerator';
import bytesForHumans from 'kolibri/uiText/bytesForHumans';
import { get } from '@vueuse/core';
import useUser from 'kolibri/composables/useUser';
import { handleApiError } from 'kolibri/utils/appError';

/* Function to fetch device info from the backend
 * and resolve validated data
 */
export function getDeviceInfo() {
  const requests = [
    client({ url: urls['kolibri:core:deviceinfo']() }),
    client({ url: urls['kolibri:core:devicename']() }),
  ];
  return Promise.all(requests).then(([infoResponse, nameResponse]) => {
    const data = infoResponse.data;
    data.server_time = new Date(data.server_time);
    data.free_space = data.content_storage_free_space;
    data.content_storage_free_space = bytesForHumans(data.content_storage_free_space);
    data.device_name = nameResponse.data.name;

    const { server } = infoResponse.headers;
    const { isAppContext } = useUser();

    if (server.includes('0.0.0.0')) {
      if (get(isAppContext)) {
        data.server_type = 'Kolibri app server';
      } else {
        data.server_type = 'Kolibri internal server';
      }
    } else data.server_type = server;

    return data;
  });
}

/**
 * Fetches device info and commits it to the Vuex store for the device info page.
 * @param {object} store - The Vuex store instance.
 * @param {object} route - The current Vue Router route object.
 * @returns {Promise<void>} Resolves when device info has been loaded into the store.
 */
export function showDeviceInfoPage(store, route) {
  const { canManageContent } = useUser();
  if (get(canManageContent)) {
    const shouldResolve = samePageCheckGenerator(route);
    const promises = Promise.all([getDeviceInfo()]);
    return promises
      .then(function onSuccess([deviceInfo]) {
        if (shouldResolve()) {
          store.commit('deviceInfo/SET_STATE', {
            deviceInfo,
          });
        }
      })
      .catch(function onFailure(error) {
        if (shouldResolve()) {
          handleApiError({ error, reloadOnReconnect: true });
        }
      });
  }
  return Promise.resolve();
}
