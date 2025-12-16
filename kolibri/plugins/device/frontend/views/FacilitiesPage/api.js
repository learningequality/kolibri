import client from 'kolibri/client';
import urls from 'kolibri/urls';

const url = urls['kolibri:core:facility_create_facility']();

export function createFacility(payload) {
  return client({
    url,
    method: 'POST',
    data: payload,
  });
}
