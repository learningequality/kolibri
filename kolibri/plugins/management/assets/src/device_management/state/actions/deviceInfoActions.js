import client from 'kolibri.client';
import urls from 'kolibri.urls';
import bytesForHumans from '../../views/manage-content-page/bytesForHumans';

/* Function to feth device info from the backend
 * and resolve validated data
 */
export function getDeviceInfo() {
  return client({ path: urls['deviceinfo']() }).then(response => {
    const data = response.entity;
    data.server_time = new Date(data.server_time);
    data.content_storage_free_space = bytesForHumans(data.content_storage_free_space);
    return data;
  });
}
