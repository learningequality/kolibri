import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

function updateConnectionStatus(id) {
  const url = urls['kolibri:core:networklocation_update_connection_status'](id);
  return this.client({ url, method: 'post' }).then(response => {
    return response.data;
  });
}

function fetchFacilities(id) {
  return this.client({
    url: urls['kolibri:core:networklocation_facilities_detail'](id),
  }).then(response => {
    return response.data;
  });
}

export const NetworkLocationResource = new Resource({
  name: 'networklocation',
  updateConnectionStatus,
  fetchFacilities,
});

export const StaticNetworkLocationResource = new Resource({
  name: 'staticnetworklocation',
  updateConnectionStatus,
  fetchFacilities,
});

export const DynamicNetworkLocationResource = new Resource({
  name: 'dynamicnetworklocation',
  updateConnectionStatus,
  fetchFacilities,
});
