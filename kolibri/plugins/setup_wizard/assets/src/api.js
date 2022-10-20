import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';
import redirectBrowser from 'kolibri.utils.redirectBrowser';

export const FacilityImportResource = new Resource({
  name: 'facilityimport',
  namespace: 'kolibri.plugins.setup_wizard',
  grantsuperuserpermissions({ user_id, password }) {
    return this.postListEndpoint('grantsuperuserpermissions', { user_id, password });
  },
  createsuperuser({ username, full_name, password, extra_fields, facility_name }) {
    return this.postListEndpoint('createsuperuser', {
      username,
      full_name,
      password,
      extra_fields,
      facility_name,
      auth_token: 'ca6830b018e647fc9723561c99b6b3f0',
    });
  },
  provisionosuser({ device_name, language_id, is_provisioned }) {
    return this.postListEndpoint('provisionosuserdevice', {
      device_name,
      language_id,
      is_provisioned,
    });
  },
  provisiondevice({ device_name, language_id, is_provisioned }) {
    return this.postListEndpoint('provisiondevice', { device_name, language_id, is_provisioned });
  },
  facilityadmins() {
    return this.getListEndpoint('facilityadmins').then(response => {
      return response.data;
    });
  },
  listfacilitylearners(params) {
    return this.postListEndpoint('listfacilitylearners', params).then(response => {
      return response.data;
    });
  },
});

export const FinishSoUDSyncingResource = new Resource({
  name: 'restartzeroconf',
  namespace: 'kolibri.plugins.setup_wizard',
  finish() {
    const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';
    const device_url = urls['kolibri:kolibri.plugins.device:device_management'];
    window.sessionStorage.setItem(welcomeDimissalKey, false);
    this.postListEndpoint('restart');
    redirectBrowser(device_url ? device_url() : null);
    return '';
  },
});
