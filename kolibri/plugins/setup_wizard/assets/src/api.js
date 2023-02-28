import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';
import redirectBrowser from 'kolibri.utils.redirectBrowser';

/**
 * The <Module>Resource classes here map directly to the <Module>ViewSet of the same
 * name in the kolibri.plugins.setup_wizard.api module (note how the definitions of)
 * the Resource instances below have 'kolibri.plugins.setup_wizard' for their 'namespace'
 **/

export const SetupWizardResource = new Resource({
  name: 'setupwizard',
  namespace: 'kolibri.plugins.setup_wizard',

  createuseronremote({ facility_id, username, password, baseurl }) {
    return this.postListEndpoint('createuseronremote', {
      facility_id,
      username,
      password,
      baseurl,
    });
  },
  provisiondevice({ device_name, language_id, is_provisioned }) {
    return this.postListEndpoint('provisiondevice', { device_name, language_id, is_provisioned });
  },

  // Also creates the facility w/ given name if one doesn't exist already
  createonmyownuser({ username, full_name, password, facility, extra_fields }) {
    return this.postListEndpoint('createonmyownuser', {
      username,
      full_name,
      password,
      facility,
      extra_fields,
    });
  },

  // Also creates the facility w/ given name if one doesn't exist already
  createappuser({ facility, extra_fields, auth_token }) {
    return this.postListEndpoint('createappuser', {
      facility,
      extra_fields,
      auth_token,
    });
  },

  // Also creates the facility w/ given name if one doesn't exist already
  createsuperuser({ username, full_name, password, extra_fields, facility_name }) {
    return this.postListEndpoint('createsuperuser', {
      username,
      full_name,
      password,
      extra_fields,
      facility_name,
    });
  },
});

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
