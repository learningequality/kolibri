import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { Resource } from 'kolibri/apiResource';

/**
 * The <Module>Resource classes here map directly to the <Module>ViewSet of the same
 * name in the kolibri.plugins.setup_wizard.api module (note how the definitions of)
 * the Resource instances below have 'kolibri.plugins.setup_wizard' for their 'namespace'.
 */

export const SetupWizardResource = new Resource({
  name: 'setupwizard',
  namespace: 'kolibri.plugins.setup_wizard',

  async createuseronremote({ facility_id, username, password, full_name, baseurl }) {
    const response = await this.request({
      method: 'POST',
      action: 'createuseronremote',
      data: { facility_id, username, password, full_name, baseurl },
    });
    return response.data;
  },
});

export const FacilityImportResource = new Resource({
  name: 'facilityimport',
  namespace: 'kolibri.plugins.setup_wizard',
  async grantsuperuserpermissions({ user_id, password }) {
    const response = await this.request({
      method: 'POST',
      action: 'grantsuperuserpermissions',
      data: { user_id, password },
    });
    return response.data;
  },
  async createsuperuser({ username, full_name, password, extra_fields, facility_name }) {
    const response = await this.request({
      method: 'POST',
      action: 'createsuperuser',
      data: { username, full_name, password, extra_fields, facility_name },
    });
    return response.data;
  },
  async facilityadmins() {
    const response = await this.request({ action: 'facilityadmins' });
    return response.data;
  },
  async listfacilitylearners(params) {
    const { data } = await client({
      url: urls['kolibri:core:remotefacilityauthenticateduserinfo'](),
      method: 'POST',
      data: params,
    });

    const admin = data.find(user => user.username === params.username);
    const students = data.filter(user => !user.roles || !user.roles.length);

    return {
      admin,
      students,
    };
  },
});
