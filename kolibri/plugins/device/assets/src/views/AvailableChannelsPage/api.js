import client from 'kolibri.client';
import urls from 'kolibri.urls';

export function getFreeSpaceOnServer() {
  return client({ path: urls['kolibri:core:deviceinfo']() }).then(response => {
    return {
      freespace: response.entity.content_storage_free_space,
    };
  });
}
