import client from 'kolibri/client';
import urls from 'kolibri/urls';

export function getFreeSpaceOnServer() {
  return client({ url: urls['kolibri:core:deviceinfo']() }).then(response => {
    return {
      freeSpace: response.data.content_storage_free_space,
    };
  });
}
