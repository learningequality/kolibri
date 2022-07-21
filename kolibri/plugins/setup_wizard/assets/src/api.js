import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';
import redirectBrowser from 'kolibri.utils.redirectBrowser';

export const FacilityImportResource = new Resource({
  name: 'facilityimport',
  namespace: 'kolibri.plugins.setup_wizard',
  grantsuperuserpermissions({ user_id, password }) {
    return this.postListEndpoint('grantsuperuserpermissions', { user_id, password });
  },
  createsuperuser({ username, full_name, password }) {
    return this.postListEndpoint('createsuperuser', { username, full_name, password });
  },
  provisiondevice({ device_name, language_id }) {
    return this.postListEndpoint('provisiondevice', { device_name, language_id });
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
