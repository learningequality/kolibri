import { Resource } from 'kolibri.lib.apiResource';

/**
 * The <Module>Resource classes here map directly to the <Module>ViewSet of the same
 * name in the kolibri.plugins.setup_wizard.api module (note how the definitions of)
 * the Resource instances below have 'kolibri.plugins.setup_wizard' for their 'namespace'
 **/

export const SetupWizardResource = new Resource({
  name: 'setupwizard',
  namespace: 'kolibri.plugins.setup_wizard',

  createuseronremote({ facility_id, username, password, full_name, baseurl }) {
    return this.postListEndpoint('createuseronremote', {
      facility_id,
      username,
      password,
      full_name,
      baseurl,
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
